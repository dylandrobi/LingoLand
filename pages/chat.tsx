import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";
import { RtmChannel } from "agora-rtm-sdk";
import {
    ICameraVideoTrack,
    IRemoteVideoTrack,
    IAgoraRTCClient,
    IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import router from "next/router";
import IAudioTrack from "agora-rtc-sdk-ng"; // Import the missing IAudioTrack type

type TCreateRoomResponse = {
    room: Room;
    rtcToken: string;
    rtmToken: string;
};

type TGetRandomRoomResponse = {
    rtcToken: string;
    rtmToken: string;
    rooms: Room[];
};

type Room = {
    _id: string;
    status: string;
};

type TMessage = {
    userId: string;
    message: string | undefined;
};

function createRoom(userId: string): Promise<TCreateRoomResponse> {
    return fetch(`/api/rooms?userId=${userId}`, {
        method: "POST",
    }).then((response) => response.json());
}

function setRoomToWaiting(roomId: string) {
    return fetch(`/api/rooms/${roomId}`, { method: "PUT" }).then((response) =>
        response.json()
    );
}

export const VideoPlayer = ({
    videoTrack,
    style,
}: {
    videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
    style: object;
}) => {
    const ref = useRef(null);

    useEffect(() => {
        const playerRef = ref.current;
        if (!videoTrack) return;
        if (!playerRef) return;

        videoTrack.play(playerRef);

        return () => {
            videoTrack.stop();
        };
    }, [videoTrack]);

    return <div ref={ref} style={style}></div>;
};






async function connectToAgoraRtm(
    roomId: string,
    userId: string,
    onMessage: (message: TMessage) => void,
    token: string
) {
    const { default: AgoraRTM } = await import("agora-rtm-sdk");
    const client = AgoraRTM.createInstance(process.env.NEXT_PUBLIC_AGORA_APP_ID!);
    await client.login({
        uid: userId,
        token,
    });
    const channel = client.createChannel(roomId);
    await channel.join();
    channel.on("ChannelMessage", (message, userId) => {
        onMessage({
            userId,
            message: message.text,
        });
    });

    return {
        channel,
    };
}

export default function Home() {
  
  // Add a state to manage video enable/disable status
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null);
    const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
  // Add the microphoneTrackRef here
    const cameraTrackRef = useRef<ICameraVideoTrack | null>(null); // This is the initialization
    const microphoneTrackRef = useRef<IAudioTrack | null>(null);
    const microphoneTrack = useRef<IAudioTrack>(); 
    const [showNext, setShowNext] = useState(false);
    const [showMainMenu, setShowMainMenu] = useState(false);
    const [userId, setUserId] = useState("");
    const [room, setRoom] = useState<Room | undefined>();
    const [messages, setMessages] = useState<TMessage[]>([]);
    const [input, setInput] = useState("");
    const [themVideo, setThemVideo] = useState<IRemoteVideoTrack>();
    const [myVideo, setMyVideo] = useState<ICameraVideoTrack>();
    const [themAudio, setThemAudio] = useState<IRemoteAudioTrack>();
    const channelRef = useRef<RtmChannel>();
    const rtcClientRef = useRef<IAgoraRTCClient>();
    const { data: session } = useSession();
    const canChat = session?.user?.fluentLanguages && session?.user?.practiceLanguage &&
        session.user.practiceLanguage !== '';
    const [userPreferences, setUserPreferences] = useState({
        fluentLanguages: {},
        practiceLanguage: '',
        partnerLanguagePreference: '',
        partnerPreferenceOption: '',
    });

    const handleStopChatting = useCallback(async () => {
      if (room) {
          
          // Leave the Agora RTC channel
          if (rtcClientRef.current) {
              rtcClientRef.current.leave();
              rtcClientRef.current = null;
          }

          // Stop the local video and audio tracks
          if (myVideo) {
              myVideo.stop();
              myVideo.close();
              setMyVideo(null);
          }

          if (themVideo) {
              themVideo.stop();
              themVideo.close();
              setThemVideo(null);
          }

          // Update room status to 'waiting' in the database
          // await setRoomToWaiting(room._id);
          console.log("UserID being sentttt:", userId);
          sendSystemMessage('USER_LEFT', {userId: userId});
          await sendSystemMessage('USER_LEFT', {userId: userId});
          try {
              const response = await fetch(`/api/rooms/${[room._id]}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
                
              });
              if (!response.ok) {
                throw new Error('Failed to update room status');
              }
              // Handle success
              console.log("Successfully left the room");
            } catch (error) {
              console.error("Error leaving room:", error);
            }
          
          // Reset the room and message state
          // setRoom(undefined);
          if (channelRef.current && userId) {
              const systemMessage = JSON.stringify({
                  type: "SYSTEM",
                  content: "USER_LEFT",
                  userId: userId
              });
              await channelRef.current.sendMessage({ text: systemMessage });
          }
          console.log("Clearing messages"); // Debugging
          setMessages([]); // Clear messages
          console.log("Messages after clearing:", messages); // This might still show old messages due to async state update
          setRoom(undefined);

          // Show 'Next' and 'Back to Main Menu' buttons
          setShowNext(true);
          setShowMainMenu(true);
      }
  }, [room, userId]);

    useEffect(() => {
        const fetchPreferences = async () => {
            if (session?.user?.id) {
              setUserId(session.user.id);
                try {
                    const response = await fetch(`/api/user/${session.user.id}/preferences`);
                    if (response.ok) {
                        const data = await response.json();
                        setUserPreferences({
                            fluentLanguages: data.fluentLanguages,
                            practiceLanguage: data.practiceLanguage,
                            partnerLanguagePreference: data.partnerLanguagePreference,
                            partnerPreferenceOption: data.partnerPreferenceOption,
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user preferences:', error);
                }
            }
        };
        fetchPreferences();
    }, [session]);

    useEffect(() => {
        // Function to call when user attempts to leave the page
        const handleBeforeUnload = (event) => {
          // Trigger the stop chatting logic
          handleStopChatting();
          // For beforeunload, you may need to set returnValue to trigger the confirmation dialog
          // However, using it to ensure cleanup logic runs may not be reliable for all scenarios
          event.preventDefault();
          event.returnValue = ''; // Chrome requires returnValue to be set
        };

        const handlePopState = () => {
            // Handle the case where a user navigates away using the browser's navigation buttons
            handleStopChatting();
          };
    
        // Add event listener for leaving/closing the page
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
    
        // Cleanup function to remove the event listener
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.removeEventListener('popstate', handlePopState);
        };
      }, [room, handleStopChatting]); // Add dependencies as needed

      useEffect(() => {
        const channel = channelRef.current;
        if (channel) {
            channel.on("ChannelMessage", (receivedMsg, senderId) => {
                const message = JSON.parse(receivedMsg.text);
    
                // Handle system message for user leaving
                if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
                    // Clear chat for all users
                    setMessages([]);
                } else if (message.type !== "SYSTEM") {
                    // Handle regular chat messages
                    // setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.message }]);
                }
            });
        }
    
        return () => {
            if (channel) {
                channel.removeAllListeners();
            }
        };
    }, []);

    useEffect(() => {
  const chatBox = document.querySelector('.chat-panel');
  // Ensure the chatBox element exists and has loaded
  if (chatBox) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}, [messages]);


//NEW STUFF
useEffect(() => {
    // This effect will re-subscribe to the partner's video if their video state changes
    if (isRemoteVideoEnabled && themVideo) {
      themVideo.play('partner-video-container');
    } else {
      // Display a placeholder or hide the video element as needed
      const partnerVideoElement = document.getElementById('partner-video-container');
      if (partnerVideoElement) {
        // partnerVideoElement.innerHTML = 'Partner\'s video is not available';
      }
    }
  }, [isRemoteVideoEnabled, themVideo]);


  //NEW STUFF
async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
    const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
  
    const client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
    });
  
    await client.join(
        process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        roomId,
        token,
        userId
    );
  
    
    const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    microphoneTrackRef.current = microphoneTrack; // Store the microphone track
    cameraTrackRef.current = cameraTrack; // Store the camera track
    setMyVideo(cameraTrack);
  
    await client.publish([microphoneTrack, cameraTrack]);
  
    client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
            setThemVideo(user.videoTrack);
            //NEW STUFF
            setIsRemoteVideoEnabled(true);
            //
        }
       else if (mediaType === "audio") {
          // Play the remote audio track when available
          user.audioTrack.play();
      }

      //NEW STUFF
    });
    client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          setIsRemoteVideoEnabled(false); // Add this line to update the state when remote video is unpublished
        }
    });
//

    return { microphoneTrack, cameraTrack, client };
  }


  const onMessage = (receivedMsg, senderId) => {
    const message = JSON.parse(receivedMsg.text);
  
    console.log("Received message:", message);
  
    if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
      console.log("User has left:", message.userId);
  
      // Additionally, clear the input field if the system message indicates a user has left
      setInput(""); // Reset the input field to an empty string
  
      if (message.userId !== userId) {
        setMessages([]); // Clears the chat messages
      }
    } else {
      setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.content }]);
    }
  };
  
  const toggleMicrophone = async () => {
    if (microphoneTrack) {
      await microphoneTrackRef.current?.setEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
};

  
//   const toggleVideo = async () => {
//       if (myVideo) {
//           await myVideo.setEnabled(!isVideoEnabled);
//           setIsVideoEnabled(!isVideoEnabled);
//       }
//   };


//NEW STUFF
const toggleVideo = async () => {
    if (!cameraTrackRef.current || !rtcClientRef.current) return;
  
    setIsVideoEnabled((isEnabled) => {
      if (isEnabled) {
        cameraTrackRef.current.stop(); // Stops the camera track
        rtcClientRef.current.unpublish(cameraTrackRef.current); // Unpublish the video track
        setLocalVideoTrack(null); // Remove the video track from the state
      } else {
        // Ensure the camera track is re-initialized if needed
        if (!cameraTrackRef.current) {
          initializeCameraTrack(); // You need to implement this function to recreate the camera track
        } else {
          cameraTrackRef.current.play('my-video-container'); // Plays the camera track on a specific div
          rtcClientRef.current.publish(cameraTrackRef.current); // Publish the video track
          setLocalVideoTrack(cameraTrackRef.current); // Update the state with the new video track
        }
      }
      return !isEnabled;
    });
  };


    const canStartChatting = () => {
        const hasFluentLanguage = Object.values(userPreferences.fluentLanguages).some(value => value);
        const hasPracticeLanguage = userPreferences.practiceLanguage !== '';
        return hasFluentLanguage && hasPracticeLanguage;
    };

    const formatStrangerPreference = () => {
        switch (userPreferences.partnerPreferenceOption) {
            case 'specific':
                return userPreferences.partnerLanguagePreference;
            case 'languageImPracticing':
                return userPreferences.practiceLanguage;
            case 'any':
                const fluentLanguagesList = Object.keys(userPreferences.fluentLanguages)
                    .filter(lang => userPreferences.fluentLanguages[lang])
                    .join(', ');
                return fluentLanguagesList.length > 1 ? `one of: ${fluentLanguagesList}` : fluentLanguagesList;
            default:
                return 'N/A';
        }
    };

    useEffect(() => {
        console.log("Current Messages:", messages);
      }, [messages]); // This will log messages state every time it changes


      const handleIncomingMessage = (message) => {
        if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
          // Clear the chat messages array
          setMessages([]);
      
          // Clear the chat input field
          setInput("");
      
          // Optionally, you might want to show a notification or perform other UI updates here
        } else {
          // Handle regular chat messages
          setMessages(prevMessages => [...prevMessages, message]);
        }
      };


    //   const handleStopChatting = useCallback(async () => {
    //     if (room) {
            
    //         // Leave the Agora RTC channel
    //         if (rtcClientRef.current) {
    //             rtcClientRef.current.leave();
    //             rtcClientRef.current = null;
    //         }

    //         // Stop the local video and audio tracks
    //         if (myVideo) {
    //             myVideo.stop();
    //             myVideo.close();
    //             setMyVideo(null);
    //         }

    //         if (themVideo) {
    //             themVideo.stop();
    //             themVideo.close();
    //             setThemVideo(null);
    //         }

    //         // Update room status to 'waiting' in the database
    //         // await setRoomToWaiting(room._id);
    //         console.log("UserID being sentttt:", userId);
    //         sendSystemMessage('USER_LEFT', {userId: userId});
    //         await sendSystemMessage('USER_LEFT', {userId: userId});
    //         try {
    //             const response = await fetch(`/api/rooms/${[room._id]}`, {
    //               method: 'PUT',
    //               headers: {
    //                 'Content-Type': 'application/json',
    //               },
    //               body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
                  
    //             });
    //             if (!response.ok) {
    //               throw new Error('Failed to update room status');
    //             }
    //             // Handle success
    //             console.log("Successfully left the room");
    //           } catch (error) {
    //             console.error("Error leaving room:", error);
    //           }
            
    //         // Reset the room and message state
    //         // setRoom(undefined);
    //         if (channelRef.current && userId) {
    //             const systemMessage = JSON.stringify({
    //                 type: "SYSTEM",
    //                 content: "USER_LEFT",
    //                 userId: userId
    //             });
    //             await channelRef.current.sendMessage({ text: systemMessage });
    //         }
    //         console.log("Clearing messages"); // Debugging
    //         setMessages([]); // Clear messages
    //         console.log("Messages after clearing:", messages); // This might still show old messages due to async state update
    //         setRoom(undefined);

    //         // Show 'Next' and 'Back to Main Menu' buttons
    //         setShowNext(true);
    //         setShowMainMenu(true);
    //     }
    // }, [room, userId]);

    function onMessageReceived(message) {
        const parsedMessage = JSON.parse(message); // Assuming message is a JSON string
        
        if (parsedMessage.type === "SYSTEM" && parsedMessage.content === "USER_LEFT") {
          // Clear the messages for the remaining user
          setMessages([]);
      
          // Optional: Notify the user that someone has left the chat
          alert("A user has left the chat.");
        } else {
          // Handle regular messages
          setMessages(currentMessages => [...currentMessages, parsedMessage]);
        }
      }

    function handleNextClick() {
        setShowNext(false);
        setShowMainMenu(false);
        connectToARoom();
    }

    function handleBackToMainMenu() {
        // Redirect to the main page
        window.location.href = '/';
    }

    function handleStartChattingClicked() {
        console.log("Start Chatting Clicked");
        setShowNext(false);
        setShowMainMenu(false);
        connectToARoom();
    }

    async function handleSubmitMessage(e: React.FormEvent) {
        e.preventDefault();
        await channelRef.current?.sendMessage({
            text: input,
        });
        setMessages((cur) => [
            ...cur,
            {
                userId,
                message: input,
            },
        ]);
        setInput("");
    }

    const handleLeaveRoom = async () => {
        // Example API call to update room status
        try {
            const response = await fetch(`/api/rooms/${roomId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
            });
            if (!response.ok) {
              throw new Error('Failed to update room status');
            }
            // Handle success
            console.log("Successfully left the room");
          } catch (error) {
            console.error("Error leaving room:", error);
          }
        }

        async function sendSystemMessage(type, content) {
            const systemMessage = JSON.stringify({
                type: type,
                content: content,
            });
            
            // Assuming 'channel' is a global variable or accessible in this scope
            if (RtmChannel) {
                sendMessage(RtmChannel, systemMessage);
            } else {
                console.error("Channel is not accessible or not defined.");
            }
        }

const sendMessage = async (channel, message) => {
    // Ensure 'message' is a string; serialize if it's an object
    const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
  
    try {
      await channel.sendMessage({ text: messageToSend });
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
            
    async function handleLeaveChattingRoom() {
        // ... logic to disconnect from the room ...

        if (room && room.status === "chatting") {
            await sendSystemMessage('USER_LEFT', {userId: userId}),
            await fetch(`/api/rooms/${room._id}`, {
                method: 'PUT',
                // Include any necessary headers, body, etc.
            });
            // Handle the response as needed
        }

        // ... additional logic for UI updates, navigation, etc.
    }
    

    

    async function connectToARoom() {
        console.log("Connecting to a room");
        setThemAudio(undefined);
        setThemVideo(undefined);
        setMyVideo(undefined);
        setMessages([]);
        setShowNext(false);
        setShowMainMenu(false);


        // NEw VERSION 1.24
        let partnerLanguageArray;

        if (userPreferences.partnerPreferenceOption === 'specific') {
            partnerLanguageArray = [userPreferences.partnerLanguagePreference];
        } else if (userPreferences.partnerPreferenceOption === 'languageImPracticing') {
            partnerLanguageArray = [userPreferences.practiceLanguage];
        } else {
            partnerLanguageArray = Object.keys(userPreferences.fluentLanguages)
                                        .filter(lang => userPreferences.fluentLanguages[lang]);
        }
    

      
    if (!session.user.id) {
      console.error('User ID is undefined');
      return; // Exit the function if userId is not available
    }
  
    const userPreferencesToSend = {
      practiceLanguage: userPreferences.practiceLanguage,
      partnerLanguage: partnerLanguageArray,
  };
  
    const queryString = new URLSearchParams({
      practiceLanguage: userPreferences.practiceLanguage,
      partnerLanguage: JSON.stringify(Object.keys(userPreferences.fluentLanguages).filter(lang => userPreferences.fluentLanguages[lang])),
      userId: userId,
    }).toString();
  
    console.log("UserID being sentttt:", userId);
    
  try {

    
    const response = await fetch(`/api/rooms?practiceLanguage=${userPreferencesToSend.practiceLanguage}&partnerLanguage=${JSON.stringify(userPreferencesToSend.partnerLanguage)}&userId=${userId}`);
    if (!response.ok) {
      throw new Error(`Error fetching room: ${response.statusText}`);
    }
    const { room, rtcToken, rtmToken } = await response.json();

if (room) {
  // Connect to the matched or newly created room
  setRoom(room);
  await setupRoomConnection(room._id, userId, rtmToken, rtcToken);
} else {
  
  // This scenario should not happen as backend creates a room if none is found
  // But you can handle any unexpected case here
  console.error("No room available and unable to create a new one.");
}
  } catch (error) {
    console.error('Error in connectToARoom:', error);
  }
}
        
            async function setupRoomConnection(roomId, userId, rtmToken, rtcToken) {
                const { channel } = await connectToAgoraRtm(
                    roomId,
                    userId,
                    (message: TMessage) => setMessages((cur) => [...cur, message]),
                    rtmToken
                );
                channelRef.current = channel;
        
                const { microphoneTrack, cameraTrack, client } = await connectToAgoraRtc(
                  roomId, 
                  userId, 
                  rtcToken, 
                  setMyVideo, 
                  setThemVideo
                );
                microphoneTrackRef.current = microphoneTrack;
                cameraTrackRef.current = cameraTrack;
                setLocalVideoTrack(cameraTrack); // Update the local video track state
                rtcClientRef.current = client;
            }

          
            function convertToYouThem(message: TMessage) {
    return message.userId === userId ? "You" : "Them";
  }
        
            const isChatting = room!!;

            return (
                <>
        
                    <main 
                    className={styles.main}>
                        {isChatting ? (
                            <>
                                {/* {room._id} */}
                                {showNext ? (
                                    <>
                                        <button onClick={handleNextClick}>Next</button>
                                        <button
                                        className="back-to-menu"
                                        onClick={handleBackToMainMenu}
                                        
                                        >Back to Main Menu</button>
                                    </>
                                ) : (
                                  <div>
                                    <button onClick={handleStopChatting} className="button stop-button">Stop</button>
                                    {/* Toggle Video Button */}
                        <button onClick={toggleVideo} className="button video-button">
                            {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
                        </button>

                        <button onClick={toggleMicrophone} className="button mic-button">
                            {isMicEnabled ? "Turn Off Mic" : "Turn On Mic"}
                        </button>

                                
                                  </div>
                                )}
                                <div className="chat-window">
                                    <div className="video-panel">
                                        <div className="video-box"
                                        id='my-video-container'>
                                            {localVideoTrack  && (
                                                <VideoPlayer
                                                    style={{ width: "100%", height: "100%" }}
                                                    videoTrack={localVideoTrack}
                                                />
                                            )}
                                        </div>
                                        <div className="video-box"
                                        id='partner-video-container'>
                                            {remoteVideoTrack  && (
                                                <VideoPlayer
                                                    style={{ width: "100%", height: "100%" }}
                                                    videoTrack={remoteVideoTrack}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="chat">
                                    <div className="chat-panel" key={messages.length} style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                    <ul>
                                        {messages.map((message, idx) => (
                                            <li key={idx} className="message" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                                {convertToYouThem(message)} - {message.message}
                                            </li>
                                        ))}
                                    </ul>
                                    </div>
                                    
                                        <div className="chat-input-container"> 
                                        <form onSubmit={handleSubmitMessage}>
                                            <input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                type="text" className="chat-input" placeholder="Type a message..."
                                            ></input>
                                            <button>Submit</button>
                                        </form>
                                        </div>
                                        </div>

                                    
                                </div>
                            </>
                        ) : (
                            <div>
                                {canChat ? (
                                    <p>
                                      
                                    </p>
                                ) : (
                                    <p>
                                        You can't start chatting until you set your language preferences, click{' '}
                                        <Link href="/language-preferences" className={styles.boldUnderline}>here</Link>.
                                    </p>
                                )}
        
                                {canStartChatting() ? (
                                    <>
                                        <div className="before-chatting-screen">
                                        <p>I am going to practice: {userPreferences.practiceLanguage}</p>
                                        <p>My partner is going to practice: {formatStrangerPreference()}</p>
                                        <button 
                                        className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                                        onClick={handleStartChattingClicked}>Start Chatting</button>
                                        
                                        <button className="back-to-menu" onClick={() => (window.location.href = '/')}>
                                            Back to Main Menu
                                        </button>
                                        </div>
                                    </>
                                ) : (
                                    <p>
                                        Please complete your language preferences to start chatting.
                                    </p>
                                )}
                                
                            </div>
                        )}
                    </main>
                </>
            );
        };

//LAST WORKING ONE AS OF 3/5/24
// import React, { useEffect, useRef, useState } from "react";
// import styles from "../styles/Home.module.css";
// import { RtmChannel } from "agora-rtm-sdk";
// import {
//     ICameraVideoTrack,
//     IRemoteVideoTrack,
//     IAgoraRTCClient,
//     IRemoteAudioTrack,
// } from "agora-rtc-sdk-ng";
// import { useSession } from 'next-auth/react';
// import Link from 'next/link';
// import router from "next/router";
// import IAudioTrack from "agora-rtc-sdk-ng"; // Import the missing IAudioTrack type

// type TCreateRoomResponse = {
//     room: Room;
//     rtcToken: string;
//     rtmToken: string;
// };

// type TGetRandomRoomResponse = {
//     rtcToken: string;
//     rtmToken: string;
//     rooms: Room[];
// };

// type Room = {
//     _id: string;
//     status: string;
// };

// type TMessage = {
//     userId: string;
//     message: string | undefined;
// };

// function createRoom(userId: string): Promise<TCreateRoomResponse> {
//     return fetch(`/api/rooms?userId=${userId}`, {
//         method: "POST",
//     }).then((response) => response.json());
// }

// function setRoomToWaiting(roomId: string) {
//     return fetch(`/api/rooms/${roomId}`, { method: "PUT" }).then((response) =>
//         response.json()
//     );
// }

// export const VideoPlayer = ({
//     videoTrack,
//     style,
// }: {
//     videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
//     style: object;
// }) => {
//     const ref = useRef(null);

//     useEffect(() => {
//         const playerRef = ref.current;
//         if (!videoTrack) return;
//         if (!playerRef) return;

//         videoTrack.play(playerRef);

//         return () => {
//             videoTrack.stop();
//         };
//     }, [videoTrack]);

//     return <div ref={ref} style={style}></div>;
// };






// async function connectToAgoraRtm(
//     roomId: string,
//     userId: string,
//     onMessage: (message: TMessage) => void,
//     token: string
// ) {
//     const { default: AgoraRTM } = await import("agora-rtm-sdk");
//     const client = AgoraRTM.createInstance(process.env.NEXT_PUBLIC_AGORA_APP_ID!);
//     await client.login({
//         uid: userId,
//         token,
//     });
//     const channel = client.createChannel(roomId);
//     await channel.join();
//     channel.on("ChannelMessage", (message, userId) => {
//         onMessage({
//             userId,
//             message: message.text,
//         });
//     });

//     return {
//         channel,
//     };
// }

// export default function Home() {
  
//   // Add a state to manage video enable/disable status
//     const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//     const [isMicEnabled, setIsMicEnabled] = useState(true);
//   // Add the microphoneTrackRef here
//     const microphoneTrackRef = useRef<IAudioTrack | null>(null);
//     const microphoneTrack = useRef<IAudioTrack>(); 
//     const [showNext, setShowNext] = useState(false);
//     const [showMainMenu, setShowMainMenu] = useState(false);
//     const [userId, setUserId] = useState("");
//     const [room, setRoom] = useState<Room | undefined>();
//     const [messages, setMessages] = useState<TMessage[]>([]);
//     const [input, setInput] = useState("");
//     const [themVideo, setThemVideo] = useState<IRemoteVideoTrack>();
//     const [myVideo, setMyVideo] = useState<ICameraVideoTrack>();
//     const [themAudio, setThemAudio] = useState<IRemoteAudioTrack>();
//     const channelRef = useRef<RtmChannel>();
//     const rtcClientRef = useRef<IAgoraRTCClient>();
//     const { data: session } = useSession();
//     const canChat = session?.user?.fluentLanguages && session?.user?.practiceLanguage &&
//         session.user.practiceLanguage !== '';
//     const [userPreferences, setUserPreferences] = useState({
//         fluentLanguages: {},
//         practiceLanguage: '',
//         partnerLanguagePreference: '',
//         partnerPreferenceOption: '',
//     });

//     useEffect(() => {
//         const fetchPreferences = async () => {
//             if (session?.user?.id) {
//               setUserId(session.user.id);
//                 try {
//                     const response = await fetch(`/api/user/${session.user.id}/preferences`);
//                     if (response.ok) {
//                         const data = await response.json();
//                         setUserPreferences({
//                             fluentLanguages: data.fluentLanguages,
//                             practiceLanguage: data.practiceLanguage,
//                             partnerLanguagePreference: data.partnerLanguagePreference,
//                             partnerPreferenceOption: data.partnerPreferenceOption,
//                         });
//                     }
//                 } catch (error) {
//                     console.error('Error fetching user preferences:', error);
//                 }
//             }
//         };
//         fetchPreferences();
//     }, [session]);

//     useEffect(() => {
//         // Function to call when user attempts to leave the page
//         const handleBeforeUnload = (event) => {
//           // Trigger the stop chatting logic
//           handleStopChatting();
//           // For beforeunload, you may need to set returnValue to trigger the confirmation dialog
//           // However, using it to ensure cleanup logic runs may not be reliable for all scenarios
//           event.preventDefault();
//           event.returnValue = ''; // Chrome requires returnValue to be set
//         };

//         const handlePopState = () => {
//             // Handle the case where a user navigates away using the browser's navigation buttons
//             handleStopChatting();
//           };
    
//         // Add event listener for leaving/closing the page
//         window.addEventListener('beforeunload', handleBeforeUnload);
//         window.addEventListener('popstate', handlePopState);
    
//         // Cleanup function to remove the event listener
//         return () => {
//           window.removeEventListener('beforeunload', handleBeforeUnload);
//           window.removeEventListener('popstate', handlePopState);
//         };
//       }, [room, handleStopChatting]); // Add dependencies as needed

//       useEffect(() => {
//         const channel = channelRef.current;
//         if (channel) {
//             channel.on("ChannelMessage", (receivedMsg, senderId) => {
//                 const message = JSON.parse(receivedMsg.text);
    
//                 // Handle system message for user leaving
//                 if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
//                     // Clear chat for all users
//                     setMessages([]);
//                 } else if (message.type !== "SYSTEM") {
//                     // Handle regular chat messages
//                     // setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.message }]);
//                 }
//             });
//         }
    
//         return () => {
//             if (channel) {
//                 channel.removeAllListeners();
//             }
//         };
//     }, []);

//     useEffect(() => {
//   const chatBox = document.querySelector('.chat-panel');
//   // Ensure the chatBox element exists and has loaded
//   if (chatBox) {
//     chatBox.scrollTop = chatBox.scrollHeight;
//   }
// }, [messages]);


// async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
//     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
  
//     const client = AgoraRTC.createClient({
//         mode: "rtc",
//         codec: "vp8",
//     });
  
//     await client.join(
//         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
//         roomId,
//         token,
//         userId
//     );
  
    
//     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
//     microphoneTrackRef.current = microphoneTrack; // Store the microphone track
//     setMyVideo(cameraTrack);
  
//     await client.publish([microphoneTrack, cameraTrack]);
  
//     client.on("user-published", async (user, mediaType) => {
//         await client.subscribe(user, mediaType);
//         if (mediaType === "video") {
//             setThemVideo(user.videoTrack);
//         }
//        else if (mediaType === "audio") {
//           // Play the remote audio track when available
//           user.audioTrack.play();
//       }
        
//     });
  
//     return { microphoneTrack, cameraTrack, client };
//   }



// const onMessage = (receivedMsg, senderId) => {
//     const message = JSON.parse(receivedMsg.text);

//     // Log received message for debugging
//     console.log("Received message:", message);

//     if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
//         // Handle system message without updating the chat messages state
//         console.log("System message for user leaving received:", message.userId);
//         if (message.userId !== userId) {
//             // Logic to handle if another user left, if needed
//         }
//     } else {
//         // Add non-system messages to the chat
//         setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.content }]);
//     }
// };

//   const toggleMicrophone = async () => {
//     if (microphoneTrack) {
//       await microphoneTrackRef.current?.setEnabled(!isMicEnabled);
//       setIsMicEnabled(!isMicEnabled);
//     }
// };

  
//   const toggleVideo = async () => {
//       if (myVideo) {
//           await myVideo.setEnabled(!isVideoEnabled);
//           setIsVideoEnabled(!isVideoEnabled);
//       }
//   };

//     const canStartChatting = () => {
//         const hasFluentLanguage = Object.values(userPreferences.fluentLanguages).some(value => value);
//         const hasPracticeLanguage = userPreferences.practiceLanguage !== '';
//         return hasFluentLanguage && hasPracticeLanguage;
//     };

//     const formatStrangerPreference = () => {
//         switch (userPreferences.partnerPreferenceOption) {
//             case 'specific':
//                 return userPreferences.partnerLanguagePreference;
//             case 'languageImPracticing':
//                 return userPreferences.practiceLanguage;
//             case 'any':
//                 const fluentLanguagesList = Object.keys(userPreferences.fluentLanguages)
//                     .filter(lang => userPreferences.fluentLanguages[lang])
//                     .join(', ');
//                 return fluentLanguagesList.length > 1 ? `one of: ${fluentLanguagesList}` : fluentLanguagesList;
//             default:
//                 return 'N/A';
//         }
//     };

//     useEffect(() => {
//         console.log("Current Messages:", messages);
//       }, [messages]); // This will log messages state every time it changes

//     async function handleStopChatting() {
//         if (room) {
            
//             // Leave the Agora RTC channel
//             if (rtcClientRef.current) {
//                 rtcClientRef.current.leave();
//                 rtcClientRef.current = null;
//             }

//             // Stop the local video and audio tracks
//             if (myVideo) {
//                 myVideo.stop();
//                 myVideo.close();
//                 setMyVideo(null);
//             }

//             if (themVideo) {
//                 themVideo.stop();
//                 themVideo.close();
//                 setThemVideo(null);
//             }

//             // Update room status to 'waiting' in the database
//             // await setRoomToWaiting(room._id);
//             console.log("UserID being sentttt:", userId);
            
//             try {
//                 const response = await fetch(`/api/rooms/${[room._id]}`, {
//                   method: 'PUT',
//                   headers: {
//                     'Content-Type': 'application/json',
//                   },
//                   body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
                  
//                 });
//                 if (!response.ok) {
//                   throw new Error('Failed to update room status');
//                 }
//                 // Handle success
//                 console.log("Successfully left the room");
//               } catch (error) {
//                 console.error("Error leaving room:", error);
//               }
            
//             // Reset the room and message state
//             // setRoom(undefined);
//             if (channelRef.current && userId) {
//                 const systemMessage = JSON.stringify({
//                     type: "SYSTEM",
//                     content: "USER_LEFT",
//                     userId: userId
//                 });
//                 await channelRef.current.sendMessage({ text: systemMessage });
//             }
//             console.log("Clearing messages"); // Debugging
//             setMessages([]); // Clear messages
//             console.log("Messages after clearing:", messages); // This might still show old messages due to async state update
//             setRoom(undefined);

//             // Show 'Next' and 'Back to Main Menu' buttons
//             setShowNext(true);
//             setShowMainMenu(true);
//         }
//     }

//     function handleNextClick() {
//         setShowNext(false);
//         setShowMainMenu(false);
//         connectToARoom();
//     }

//     function handleBackToMainMenu() {
//         // Redirect to the main page
//         window.location.href = '/';
//     }

//     function handleStartChattingClicked() {
//         console.log("Start Chatting Clicked");
//         setShowNext(false);
//         setShowMainMenu(false);
//         connectToARoom();
//     }

//     async function handleSubmitMessage(e: React.FormEvent) {
//         e.preventDefault();
//         await channelRef.current?.sendMessage({
//             text: input,
//         });
//         setMessages((cur) => [
//             ...cur,
//             {
//                 userId,
//                 message: input,
//             },
//         ]);
//         setInput("");
//     }

//     const handleLeaveRoom = async () => {
//         // Example API call to update room status
//         try {
//             const response = await fetch(`/api/rooms/${roomId}`, {
//               method: 'PUT',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
//             });
//             if (!response.ok) {
//               throw new Error('Failed to update room status');
//             }
//             // Handle success
//             console.log("Successfully left the room");
//           } catch (error) {
//             console.error("Error leaving room:", error);
//           }
//         }
//     async function handleLeaveChattingRoom() {
//         // ... logic to disconnect from the room ...

//         if (room && room.status === "chatting") {
//             await fetch(`/api/rooms/${room._id}`, {
//                 method: 'PUT',
//                 // Include any necessary headers, body, etc.
//             });
//             // Handle the response as needed
//         }

//         // ... additional logic for UI updates, navigation, etc.
//     }
    

    

//     async function connectToARoom() {
//         console.log("Connecting to a room");
//         setThemAudio(undefined);
//         setThemVideo(undefined);
//         setMyVideo(undefined);
//         setMessages([]);
//         setShowNext(false);
//         setShowMainMenu(false);


//         // NEw VERSION 1.24
//         let partnerLanguageArray;

//         if (userPreferences.partnerPreferenceOption === 'specific') {
//             partnerLanguageArray = [userPreferences.partnerLanguagePreference];
//         } else if (userPreferences.partnerPreferenceOption === 'languageImPracticing') {
//             partnerLanguageArray = [userPreferences.practiceLanguage];
//         } else {
//             partnerLanguageArray = Object.keys(userPreferences.fluentLanguages)
//                                         .filter(lang => userPreferences.fluentLanguages[lang]);
//         }
    

      
//     if (!session.user.id) {
//       console.error('User ID is undefined');
//       return; // Exit the function if userId is not available
//     }
  
//     const userPreferencesToSend = {
//       practiceLanguage: userPreferences.practiceLanguage,
//       partnerLanguage: partnerLanguageArray,
//   };
  
//     const queryString = new URLSearchParams({
//       practiceLanguage: userPreferences.practiceLanguage,
//       partnerLanguage: JSON.stringify(Object.keys(userPreferences.fluentLanguages).filter(lang => userPreferences.fluentLanguages[lang])),
//       userId: userId,
//     }).toString();
  
//     console.log("UserID being sentttt:", userId);
    
//   try {

    
//     const response = await fetch(`/api/rooms?practiceLanguage=${userPreferencesToSend.practiceLanguage}&partnerLanguage=${JSON.stringify(userPreferencesToSend.partnerLanguage)}&userId=${userId}`);
//     if (!response.ok) {
//       throw new Error(`Error fetching room: ${response.statusText}`);
//     }
//     const { room, rtcToken, rtmToken } = await response.json();

// if (room) {
//   // Connect to the matched or newly created room
//   setRoom(room);
//   await setupRoomConnection(room._id, userId, rtmToken, rtcToken);
// } else {
  
//   // This scenario should not happen as backend creates a room if none is found
//   // But you can handle any unexpected case here
//   console.error("No room available and unable to create a new one.");
// }
//   } catch (error) {
//     console.error('Error in connectToARoom:', error);
//   }
// }
        
//             async function setupRoomConnection(roomId, userId, rtmToken, rtcToken) {
//                 const { channel } = await connectToAgoraRtm(
//                     roomId,
//                     userId,
//                     (message: TMessage) => setMessages((cur) => [...cur, message]),
//                     rtmToken
//                 );
//                 channelRef.current = channel;
        
//                 const { microphoneTrack, cameraTrack, client } = await connectToAgoraRtc(
//                   roomId, 
//                   userId, 
//                   rtcToken, 
//                   setMyVideo, 
//                   setThemVideo
//                 );
//                 rtcClientRef.current = client;
//             }

          
//             function convertToYouThem(message: TMessage) {
//     return message.userId === userId ? "You" : "Them";
//   }
        
//             const isChatting = room!!;

//             return (
//                 <>
        
//                     <main 
//                     className={styles.main}>
//                         {isChatting ? (
//                             <>
//                                 {/* {room._id} */}
//                                 {showNext ? (
//                                     <>
//                                         <button onClick={handleNextClick}>Next</button>
//                                         <button
//                                         className="back-to-menu"
//                                         onClick={handleBackToMainMenu}
                                        
//                                         >Back to Main Menu</button>
//                                     </>
//                                 ) : (
//                                   <div>
//                                     <button onClick={handleStopChatting} className="button stop-button">Stop</button>
//                                     {/* Toggle Video Button */}
//                         <button onClick={toggleVideo} className="button video-button">
//                             {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
//                         </button>

//                         <button onClick={toggleMicrophone} className="button mic-button">
//                             {isMicEnabled ? "Turn Off Mic" : "Turn On Mic"}
//                         </button>

                                
//                                   </div>
//                                 )}
//                                 <div className="chat-window">
//                                     <div className="video-panel">
//                                         <div className="video-box">
//                                             {myVideo && (
//                                                 <VideoPlayer
//                                                     style={{ width: "100%", height: "100%" }}
//                                                     videoTrack={myVideo}
//                                                 />
//                                             )}
//                                         </div>
//                                         <div className="video-box">
//                                             {themVideo && (
//                                                 <VideoPlayer
//                                                     style={{ width: "100%", height: "100%" }}
//                                                     videoTrack={themVideo}
//                                                 />
//                                             )}
//                                         </div>
//                                     </div>
//                                     <div className="chat">
//                                     <div className="chat-panel" key={messages.length}>
//                                     <ul>
//                                         {messages.map((message, idx) => (
//                                             <li key={idx} className="message">
//                                                 {convertToYouThem(message)} - {message.message}
//                                             </li>
//                                         ))}
//                                     </ul>
//                                     </div>
                                    
//                                         <div className="chat-input-container"> 
//                                         <form onSubmit={handleSubmitMessage}>
//                                             <input
//                                                 value={input}
//                                                 onChange={(e) => setInput(e.target.value)}
//                                                 type="text" className="chat-input" placeholder="Type a message..."
//                                             ></input>
//                                             <button>Submit</button>
//                                         </form>
//                                         </div>
//                                         </div>

                                    
//                                 </div>
//                             </>
//                         ) : (
//                             <div>
//                                 {canChat ? (
//                                     <p>
                                      
//                                     </p>
//                                 ) : (
//                                     <p>
//                                         You can't start chatting until you set your language preferences, click{' '}
//                                         <Link href="/language-preferences" className={styles.boldUnderline}>here</Link>.
//                                     </p>
//                                 )}
        
//                                 {canStartChatting() ? (
//                                     <>
//                                         <div className="before-chatting-screen">
//                                         <p>I am going to practice: {userPreferences.practiceLanguage}</p>
//                                         <p>My partner is going to practice: {formatStrangerPreference()}</p>
//                                         <button 
//                                         className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
//                                         onClick={handleStartChattingClicked}>Start Chatting</button>
                                        
//                                         <button className="back-to-menu" onClick={() => (window.location.href = '/')}>
//                                             Back to Main Menu
//                                         </button>
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <p>
//                                         Please complete your language preferences to start chatting.
//                                     </p>
//                                 )}
                                
//                             </div>
//                         )}
//                     </main>
//                 </>
//             );
//         };














// import Head from "next/head";
// import React, { useEffect, useRef, useState } from "react";
// import styles from "../styles/Home.module.css";
// import { RtmChannel } from "agora-rtm-sdk";
// import {
//     ICameraVideoTrack,
//     IRemoteVideoTrack,
//     IAgoraRTCClient,
//     IRemoteAudioTrack,
// } from "agora-rtc-sdk-ng";
// import { useSession } from 'next-auth/react';
// import Link from 'next/link';
// import router from "next/router";
// import IAudioTrack from "agora-rtc-sdk-ng"; // Import the missing IAudioTrack type
// import { set } from "mongoose";

// type TCreateRoomResponse = {
//     room: Room;
//     rtcToken: string;
//     rtmToken: string;
// };

// type TGetRandomRoomResponse = {
//     rtcToken: string;
//     rtmToken: string;
//     rooms: Room[];
// };

// type Room = {
//     _id: string;
//     status: string;
// };

// type TMessage = {
//     userId: string;
//     message: string | undefined;
// };

// function createRoom(userId: string): Promise<TCreateRoomResponse> {
//     return fetch(`/api/rooms?userId=${userId}`, {
//         method: "POST",
//     }).then((response) => response.json());
// }

// function setRoomToWaiting(roomId: string) {
//     return fetch(`/api/rooms/${roomId}`, { method: "PUT" }).then((response) =>
//         response.json()
//     );
// }

// export const VideoPlayer = ({
//     videoTrack,
//     style,
    
// }: {
//     videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
//     style: object;
// }) => {
//     const ref = useRef(null);

//     useEffect(() => {
//         const playerRef = ref.current;
//         if (!videoTrack) return;
//         if (!playerRef) return;

//         videoTrack.play(playerRef);

//         return () => {
//             videoTrack.stop();
//         };
//     }, [videoTrack]);

//     return <div ref={ref} style={style}></div>;
// };

// async function connectToAgoraRtm(
//     roomId: string,
//     userId: string,
//     onMessage: (message: TMessage) => void,
//     token: string
// ) {
//     const { default: AgoraRTM } = await import("agora-rtm-sdk");
//     const client = AgoraRTM.createInstance(process.env.NEXT_PUBLIC_AGORA_APP_ID!);
//     await client.login({
//         uid: userId,
//         token,
//     });
//     const channel = client.createChannel(roomId);
//     await channel.join();
//     channel.on("ChannelMessage", (message, userId) => {
//         onMessage({
//             userId,
//             message: message.text,
//         });
//     });

//     return {
//         channel,
//     };
// }

// export default function Home() {
  
//   // Add a state to manage video enable/disable status
//     const microphoneTrackRef = useRef<IAudioTrack | null>(null);
//     const cameraTrackRef = useRef<ICameraVideoTrack | null>(null);
//     const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//     const [isMicEnabled, setIsMicEnabled] = useState(true);
//     const microphoneTrack = useRef<IAudioTrack>(); // Declare the microphoneTrack variable
//     //const [partnerVideoAvailable, setPartnerVideoAvailable] = useState(false);
//     const [showNext, setShowNext] = useState(false);
//     const [showMainMenu, setShowMainMenu] = useState(false);
//     const [userId, setUserId] = useState("");
//     const [room, setRoom] = useState<Room | undefined>();
//     const [messages, setMessages] = useState<TMessage[]>([]);
//     const [input, setInput] = useState("");
//     //const [themVideo, setThemVideo] = useState<IRemoteVideoTrack>();
//     const [partnerVideoAvailable, setPartnerVideoAvailable] = useState(false);
//     const [themVideo, setThemVideo] = useState<IRemoteVideoTrack | null>(null);
//     const [myVideo, setMyVideo] = useState<ICameraVideoTrack>();
//     const [themAudio, setThemAudio] = useState<IRemoteAudioTrack>();
//     const channelRef = useRef<RtmChannel>();
//     const rtcClientRef = useRef<IAgoraRTCClient>();
//     const { data: session } = useSession();
//     const canChat = session?.user?.fluentLanguages && session?.user?.practiceLanguage &&
//         session.user.practiceLanguage !== '';
//     const [userPreferences, setUserPreferences] = useState({
//         fluentLanguages: {},
//         practiceLanguage: '',
//         partnerLanguagePreference: '',
//         partnerPreferenceOption: '',
//     });
    


//     useEffect(() => {
//         const fetchPreferences = async () => {
//             if (session?.user?.id) {
//               setUserId(session.user.id);
//                 try {
//                     const response = await fetch(`/api/user/${session.user.id}/preferences`);
//                     if (response.ok) {
//                         const data = await response.json();
//                         setUserPreferences({
//                             fluentLanguages: data.fluentLanguages,
//                             practiceLanguage: data.practiceLanguage,
//                             partnerLanguagePreference: data.partnerLanguagePreference,
//                             partnerPreferenceOption: data.partnerPreferenceOption,
//                         });
//                     }
//                 } catch (error) {
//                     console.error('Error fetching user preferences:', error);
//                 }
//             }
//         };
//         fetchPreferences();
//     }, [session]);

//     useEffect(() => {
//         // Function to call when user attempts to leave the page
//         const handleBeforeUnload = (event) => {
//           // Trigger the stop chatting logic
//           handleStopChatting();
//           // For beforeunload, you may need to set returnValue to trigger the confirmation dialog
//           // However, using it to ensure cleanup logic runs may not be reliable for all scenarios
//           event.preventDefault();
//           event.returnValue = ''; // Chrome requires returnValue to be set
//         };

//         const handlePopState = () => {
//             // Handle the case where a user navigates away using the browser's navigation buttons
//             handleStopChatting();
//           };
    
//         // Add event listener for leaving/closing the page
//         window.addEventListener('beforeunload', handleBeforeUnload);
//         window.addEventListener('popstate', handlePopState);
    
//         // Cleanup function to remove the event listener
//         return () => {
//           window.removeEventListener('beforeunload', handleBeforeUnload);
//           window.removeEventListener('popstate', handlePopState);
//         };
//       }, [room, handleStopChatting]); // Add dependencies as needed

//       useEffect(() => {
//         const channel = channelRef.current;
//         if (channel) {
//             channel.on("ChannelMessage", (receivedMsg, senderId) => {
//                 const message = JSON.parse(receivedMsg.text);
    
//                 // Handle system message for user leaving
//                 if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
//                     // Clear chat for all users
//                     setMessages([]);
//                 } else if (message.type !== "SYSTEM") {
//                     // Handle regular chat messages
//                     // setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.message }]);
//                 }
//             });
//         }
    
//         return () => {
//             if (channel) {
//                 channel.removeAllListeners();
//             }
//         };
//     }, []);

//     useEffect(() => {
//   const chatBox = document.querySelector('.chat-panel');
//   // Ensure the chatBox element exists and has loaded
//   if (chatBox) {
//     chatBox.scrollTop = chatBox.scrollHeight;
//   }
// }, [messages]);

// async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
//     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
  
//     const client = AgoraRTC.createClient({
//         mode: "rtc",
//         codec: "vp8",
//     });
//     const isEnabled = await microphoneTrackRef.current?.getEnabled();
//     if (isEnabled !== undefined) { // Check if isEnabled is not undefined
//     await microphoneTrackRef.current?.setEnabled(!isEnabled);
// }


//     await client.join(
//         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
//         roomId,
//         token,
//         userId
//     );
  
//     // Create microphone and camera tracks
//     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
//     microphoneTrackRef.current = microphoneTrack; // Assign the track to the ref
//     cameraTrackRef.current = cameraTrack;
//     setMyVideo(cameraTrack);
  
//     // Publish the local audio and video tracks to the channel
//     await client.publish([microphoneTrack, cameraTrack]);
  
//     client.on("user-published", async (user, mediaType) => {
//         // Subscribe to the remote user when they publish
//         await client.subscribe(user, mediaType);
        
//         if (mediaType === "video") {
//             // Play the remote video track when available
//             setThemVideo(user.videoTrack);
//         } else if (mediaType === "audio") {
//             // Play the remote audio track when available
//             user.audioTrack.play();
//         }
//     });
  
//     return { microphoneTrack, cameraTrack, client };
//   }

// // async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
// //     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
  
// //     const client = AgoraRTC.createClient({
// //         mode: "rtc",
// //         codec: "vp8",
// //     });
// //     const isEnabled = await microphoneTrackRef.current?.getEnabled();
// //     if (isEnabled !== undefined) { // Check if isEnabled is not undefined
// //     await microphoneTrackRef.current?.setEnabled(!isEnabled);
// // }
// //     await client.join(
// //         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
// //         roomId,
// //         token,
// //         userId
// //     );
  
// //     // Create microphone and camera tracks
// //     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
// //     microphoneTrackRef.current = microphoneTrack; // Assign the track to the ref
// //     cameraTrackRef.current = cameraTrack;
// //     setMyVideo(cameraTrack);
  
// //     // Publish the local audio and video tracks to the channel
// //     await client.publish([microphoneTrack, cameraTrack]);
  
// //     client.on("user-published", async (user, mediaType) => {
// //         // Subscribe to the remote user when they publish
// //         await client.subscribe(user, mediaType);
        
// //         if (mediaType === "video") {
// //             // Play the remote video track when available
// //             setThemVideo(user.videoTrack);
// //             setPartnerVideoAvailable(true); // Update state to indicate partner's video is available
// //         } else if (mediaType === "audio") {
// //             // Play the remote audio track when available
// //             user.audioTrack.play();
// //         }
// //     });

// //       // Event listener for when a remote user unpublishes their video track
// //   client.on("user-unpublished", (user, mediaType) => {
// //     if (mediaType === "video") {
// //         setPartnerVideoAvailable(false);
// //         // Optionally reset the themVideo state or handle it differently
// //         //setThemVideo(null);
// //     }
// // });

    
  
// //     return { microphoneTrack, cameraTrack, client };
// //   }

  
  

// const onMessage = (receivedMsg, senderId) => {
//     const message = JSON.parse(receivedMsg.text);

//     // Log received message for debugging
//     console.log("Received message:", message);

//     if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
//         // Handle system message without updating the chat messages state
//         console.log("System message for user leaving received:", message.userId);
//         if (message.userId !== userId) {
//             // Logic to handle if another user left, if needed
//         }
//     } else {
//         // Add non-system messages to the chat
//         setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.content }]);
//     }
// };


// //   const toggleVideo = async () => {
// //       if (myVideo) {
// //           await myVideo.setEnabled(!isVideoEnabled);
// //           setIsVideoEnabled(!isVideoEnabled);
// //       }
// //   };


// const toggleVideo2 = async () => {
//     const isEnabled = isVideoEnabled;
//     if (!isEnabled) {
//         // If video is currently off, enable it and publish
//         if (cameraTrackRef.current) {
//             await cameraTrackRef.current.setEnabled(true);
//             setIsVideoEnabled(true);
//             setMyVideo(cameraTrackRef.current);
//             //cameraTrackRef.current.play('local-video-container'); // Ensure this is your video container ID
//             await rtcClientRef.current?.publish(cameraTrackRef.current);
//         }
//     } else {
//         // If video is currently on, disable it and unpublish
//         if (cameraTrackRef.current) {
//             await rtcClientRef.current?.unpublish(cameraTrackRef.current);
//             cameraTrackRef.current.stop();
//         }
//     }
//     setIsVideoEnabled(!isEnabled); // Toggle the video enabled state
// };

// const toggleVideo = async () => {
//     if (cameraTrackRef) {
//       await cameraTrackRef.current?.setEnabled(!isVideoEnabled);
//       setIsVideoEnabled(!isVideoEnabled);
//     }
// };

  

//   const toggleMicrophone = async () => {
//     if (microphoneTrack) {
//       await microphoneTrackRef.current?.setEnabled(!isMicEnabled);
//       setIsMicEnabled(!isMicEnabled);
//     }
// };
  

//     //   const toggleVideo = async () => {
//     //     setIsVideoEnabled(!isVideoEnabled); // Toggle the state
//     //     if (myVideo) {
//     //         await myVideo.setEnabled(isVideoEnabled); // Use the updated state
//     //     }
//     // };
  

//     // Check if all necessary preferences are set

//     const canStartChatting = () => {
//         const hasFluentLanguage = Object.values(userPreferences.fluentLanguages).some(value => value);
//         const hasPracticeLanguage = userPreferences.practiceLanguage !== '';
//         return hasFluentLanguage && hasPracticeLanguage;
//     };

//     const formatStrangerPreference = () => {
//         switch (userPreferences.partnerPreferenceOption) {
//             case 'specific':
//                 return userPreferences.partnerLanguagePreference;
//             case 'languageImPracticing':
//                 return userPreferences.practiceLanguage;
//             case 'any':
//                 const fluentLanguagesList = Object.keys(userPreferences.fluentLanguages)
//                     .filter(lang => userPreferences.fluentLanguages[lang])
//                     .join(', ');
//                 return fluentLanguagesList.length > 1 ? `one of: ${fluentLanguagesList}` : fluentLanguagesList;
//             default:
//                 return 'N/A';
//         }
//     };

//     useEffect(() => {
//         console.log("Current Messages:", messages);
//       }, [messages]); // This will log messages state every time it changes

//     async function handleStopChatting() {
//         if (room) {
            
//             // Leave the Agora RTC channel
//             if (rtcClientRef.current) {
//                 rtcClientRef.current.leave();
//                 rtcClientRef.current = null;
//             }

//             // Stop the local video and audio tracks
//             if (myVideo) {
//                 myVideo.stop();
//                 myVideo.close();
//                 setMyVideo(null);
//             }

//             if (themVideo) {
//                 themVideo.stop();
//                 themVideo.close();
//                 setThemVideo(null);
//             }

//             // Update room status to 'waiting' in the database
//             // await setRoomToWaiting(room._id);
//             console.log("UserID being sentttt:", userId);
            
//             try {
//                 const response = await fetch(`/api/rooms/${[room._id]}`, {
//                   method: 'PUT',
//                   headers: {
//                     'Content-Type': 'application/json',
//                   },
//                   body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
                  
//                 });
//                 if (!response.ok) {
//                   throw new Error('Failed to update room status');
//                 }
//                 // Handle success
//                 console.log("Successfully left the room");
//               } catch (error) {
//                 console.error("Error leaving room:", error);
//               }
            
//             // Reset the room and message state
//             // setRoom(undefined);
//             if (channelRef.current && userId) {
//                 const systemMessage = JSON.stringify({
//                     type: "SYSTEM",
//                     content: "USER_LEFT",
//                     userId: userId
//                 });
//                 await channelRef.current.sendMessage({ text: systemMessage });
//             }
//             console.log("Clearing messages"); // Debugging
//             setMessages([]); // Clear messages
//             console.log("Messages after clearing:", messages); // This might still show old messages due to async state update
//             setRoom(undefined);

//             // Show 'Next' and 'Back to Main Menu' buttons
//             setShowNext(true);
//             setShowMainMenu(true);
//         }
//     }

//     function handleNextClick() {
//         setShowNext(false);
//         setShowMainMenu(false);
//         connectToARoom();
//     }

//     function handleBackToMainMenu() {
//         // Redirect to the main page
//         window.location.href = '/';
//     }

//     function handleStartChattingClicked() {
//         console.log("Start Chatting Clicked");
//         setShowNext(false);
//         setShowMainMenu(false);
//         connectToARoom();
//     }

//     async function handleSubmitMessage(e: React.FormEvent) {
//         e.preventDefault();
//         await channelRef.current?.sendMessage({
//             text: input,
//         });
//         setMessages((cur) => [
//             ...cur,
//             {
//                 userId,
//                 message: input,
//             },
//         ]);
//         setInput("");
//     }

//     const handleLeaveRoom = async () => {
//         // Example API call to update room status
//         try {
//             const response = await fetch(`/api/rooms/${roomId}`, {
//               method: 'PUT',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
//             });
//             if (!response.ok) {
//               throw new Error('Failed to update room status');
//             }
//             // Handle success
//             console.log("Successfully left the room");
//           } catch (error) {
//             console.error("Error leaving room:", error);
//           }
//         }
//     async function handleLeaveChattingRoom() {
//         // ... logic to disconnect from the room ...

//         if (room && room.status === "chatting") {
//             await fetch(`/api/rooms/${room._id}`, {
//                 method: 'PUT',
//                 // Include any necessary headers, body, etc.
//             });
//             // Handle the response as needed
//         }

//         // ... additional logic for UI updates, navigation, etc.
//     }
    

    

//     async function connectToARoom() {
//         console.log("Connecting to a room");
//         setThemAudio(undefined);
//         setThemVideo(undefined);
//         setMyVideo(undefined);
//         setMessages([]);
//         setShowNext(false);
//         setShowMainMenu(false);


//         // NEw VERSION 1.24
//         let partnerLanguageArray;

//         if (userPreferences.partnerPreferenceOption === 'specific') {
//             partnerLanguageArray = [userPreferences.partnerLanguagePreference];
//         } else if (userPreferences.partnerPreferenceOption === 'languageImPracticing') {
//             partnerLanguageArray = [userPreferences.practiceLanguage];
//         } else {
//             partnerLanguageArray = Object.keys(userPreferences.fluentLanguages)
//                                         .filter(lang => userPreferences.fluentLanguages[lang]);
//         }
    

      
//     if (!session.user.id) {
//       console.error('User ID is undefined');
//       return; // Exit the function if userId is not available
//     }
  
//     const userPreferencesToSend = {
//       practiceLanguage: userPreferences.practiceLanguage,
//       partnerLanguage: partnerLanguageArray,
//   };
  
//     const queryString = new URLSearchParams({
//       practiceLanguage: userPreferences.practiceLanguage,
//       partnerLanguage: JSON.stringify(Object.keys(userPreferences.fluentLanguages).filter(lang => userPreferences.fluentLanguages[lang])),
//       userId: userId,
//     }).toString();
  
//     console.log("UserID being sentttt:", userId);

//   try {

    
//     const response = await fetch(`/api/rooms?practiceLanguage=${userPreferencesToSend.practiceLanguage}&partnerLanguage=${JSON.stringify(userPreferencesToSend.partnerLanguage)}&userId=${userId}`);
//     if (!response.ok) {
//       throw new Error(`Error fetching room: ${response.statusText}`);
//     }
//     const { room, rtcToken, rtmToken } = await response.json();

// if (room) {
//   // Connect to the matched or newly created room
//   setRoom(room);
//   await setupRoomConnection(room._id, userId, rtmToken, rtcToken);
// } else {
  
//   // This scenario should not happen as backend creates a room if none is found
//   // But you can handle any unexpected case here
//   console.error("No room available and unable to create a new one.");
// }
//   } catch (error) {
//     console.error('Error in connectToARoom:', error);
//   }
// }
        
//             async function setupRoomConnection(roomId, userId, rtmToken, rtcToken) {
//                 const { channel } = await connectToAgoraRtm(
//                     roomId,
//                     userId,
//                     (message: TMessage) => setMessages((cur) => [...cur, message]),
//                     rtmToken
//                 );
//                 channelRef.current = channel;
        
//                 const { microphoneTrack, cameraTrack, client } = await connectToAgoraRtc(
//                   roomId, 
//                   userId, 
//                   rtcToken, 
//                   setMyVideo, 
//                   setThemVideo
//                 );
//                 rtcClientRef.current = client;
//             }

//           //   async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
//           //     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
          
//           //     const client = AgoraRTC.createClient({
//           //         mode: "rtc",
//           //         codec: "vp8",
//           //     });
          
//           //     await client.join(
//           //         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
//           //         roomId,
//           //         token,
//           //         userId
//           //     );
          
//           //     // Create and start the camera and microphone tracks
//           //     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          
//           //     // Set the local video track for rendering in your component
//           //     setMyVideo(cameraTrack);
          
//           //     // Publish the tracks to the channel
//           //     await client.publish([microphoneTrack, cameraTrack]);
          
//           //     client.on("user-published", async (user, mediaType) => {
//           //         await client.subscribe(user, mediaType);
//           //         if (mediaType === "video") {
//           //             // Set the remote video track for rendering in your component
//           //             setThemVideo(user.videoTrack);
//           //         }
//           //     });
          
//           //     return { microphoneTrack, cameraTrack, client };
//           // }
          
//             function convertToYouThem(message: TMessage) {
//     return message.userId === userId ? "You" : "Them";
//   }
        
//             const isChatting = room!!;

//             return (
//                 <>
//                     <Head>
//                         <title>Create Next App</title>
//                         <meta name="description" content="Generated by create next app" />
//                         <meta name="viewport" content="width=device-width, initial-scale=1" />
//                         <link rel="icon" href="/favicon.ico" />
//                     </Head>
        
//                     <main 
//                     className={styles.main}>
//                         {isChatting ? (
//                             <>
//                                 {/* {room._id} */}
//                                 {showNext ? (
//                                     <>
//                                         <button onClick={handleNextClick}>Next</button>
//                                         <button
//                                         className="back-to-menu"
//                                         onClick={handleBackToMainMenu}
                                        
//                                         >Back to Main Menu</button>
//                                     </>
//                                 ) : (
//                                   <div>
//                                     <button onClick={handleStopChatting} className="button stop-button">Stop</button>
//                                     {/* Toggle Video Button */}
//                         <button onClick={toggleVideo} className="button video-button">
//                             {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
//                         </button>

//                         <button onClick={toggleMicrophone} className="button mic-button">
//                             {isMicEnabled ? "Turn Off Mic" : "Turn On Mic"}
//                         </button>
          
//                                   </div>
//                                 )}
//                                 <div className="chat-window">
//                                     <div className="video-panel">
//                                         <div className="video-box" >
//                                             {myVideo && (
//                                                 <VideoPlayer
//                                                     style={{ width: "100%", height: "100%" }}
//                                                     videoTrack={myVideo}
                                                    
//                                                 />
//                                             )}
//                                         </div>
//                                         <div>
//     {/* {partnerVideoAvailable ? ( */}
//       <div className="video-box">
//         {/* Render your partner's video here */}
//         {themVideo && (
//           <VideoPlayer
//             videoTrack={themVideo}
//             style={{ width: "100%", height: "100%" }}
//           />
//         )}
//       </div>
//     {/* ) : (
//       <div>No partner video available</div>
//     )} */}
//   </div>
//                                     </div>
//                                     <div className="chat">
//                                     <div className="chat-panel" key={messages.length}>
//                                     <ul>
//                                         {messages.map((message, idx) => (
//                                             <li key={idx} className="message">
//                                                 {convertToYouThem(message)} - {message.message}
//                                             </li>
//                                         ))}
//                                     </ul>
//                                     </div>
                                    
//                                         <div className="chat-input-container"> 
//                                         <form onSubmit={handleSubmitMessage}>
//                                             <input
//                                                 value={input}
//                                                 onChange={(e) => setInput(e.target.value)}
//                                                 type="text" className="chat-input" placeholder="Type a message..."
//                                             ></input>
//                                             <button>Submit</button>
//                                         </form>
//                                         </div>
//                                         </div>

                                    
//                                 </div>
//                             </>
//                         ) : (
//                             <div>
//                                 {canChat ? (
//                                     <p>
                                      
//                                     </p>
//                                 ) : (
//                                     <p>
//                                         You can't start chatting until you set your language preferences, click{' '}
//                                         <Link href="/language-preferences" className={styles.boldUnderline}>here</Link>.
//                                     </p>
//                                 )}
        
//                                 {canStartChatting() ? (
//                                     <>
//                                         <div className="before-chatting-screen">
//                                         <p>I am going to practice: {userPreferences.practiceLanguage}</p>
//                                         <p>My partner is going to practice: {formatStrangerPreference()}</p>
//                                         <button 
//                                         className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
//                                         onClick={handleStartChattingClicked}>Start Chatting</button>
                                        
//                                         <button className="back-to-menu" onClick={() => (window.location.href = '/')}>
//                                             Back to Main Menu
//                                         </button>
//                                         </div>
//                                     </>
//                                 ) : (
//                                     <p>
//                                         Please complete your language preferences to start chatting.
//                                     </p>
//                                 )}
                                
//                             </div>
//                         )}
//                     </main>
//                 </>
//             );
//         };













































        // import Head from "next/head";
        // import React, { useEffect, useRef, useState } from "react";
        // import styles from "../styles/Home.module.css";
        // import { RtmChannel } from "agora-rtm-sdk";
        // import {
        //     ICameraVideoTrack,
        //     IRemoteVideoTrack,
        //     IAgoraRTCClient,
        //     IRemoteAudioTrack,
        // } from "agora-rtc-sdk-ng";
        // import { useSession } from 'next-auth/react';
        // import Link from 'next/link';
        // import router from "next/router";
        // import IAudioTrack from "agora-rtc-sdk-ng"; // Import the missing IAudioTrack type
        // import { set } from "mongoose";
        
        // type TCreateRoomResponse = {
        //     room: Room;
        //     rtcToken: string;
        //     rtmToken: string;
        // };
        
        // type TGetRandomRoomResponse = {
        //     rtcToken: string;
        //     rtmToken: string;
        //     rooms: Room[];
        // };
        
        // type Room = {
        //     _id: string;
        //     status: string;
        // };
        
        // type TMessage = {
        //     userId: string;
        //     message: string | undefined;
        // };
        
        // function createRoom(userId: string): Promise<TCreateRoomResponse> {
        //     return fetch(`/api/rooms?userId=${userId}`, {
        //         method: "POST",
        //     }).then((response) => response.json());
        // }
        
        // function setRoomToWaiting(roomId: string) {
        //     return fetch(`/api/rooms/${roomId}`, { method: "PUT" }).then((response) =>
        //         response.json()
        //     );
        // }
        
        // export const VideoPlayer = ({
        //     videoTrack,
        //     style,
            
        // }: {
        //     videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
        //     style: object;
        // }) => {
        //     const ref = useRef(null);
        
        //     useEffect(() => {
        //         const playerRef = ref.current;
        //         if (!videoTrack) return;
        //         if (!playerRef) return;
        
        //         videoTrack.play(playerRef);
        
        //         return () => {
        //             videoTrack.stop();
        //         };
        //     }, [videoTrack]);
        
        //     return <div ref={ref} style={style}></div>;
        // };
        
        // // export const VideoPlayer = ({
        // //     videoTrack,
        // //     style,
        // //     containerId
        // // }: {
        // //     videoTrack: IRemoteVideoTrack | ICameraVideoTrack;
        // //     style: object;
        // //     containerId?: string; // Optional container ID
        // // }) => {
        // //     const ref = useRef(null);
        
        // //     useEffect(() => {
        // //         if (videoTrack && containerId) {
        // //             videoTrack.play(containerId); // Use the container ID if provided
        // //         } else if (videoTrack && ref.current) {
        // //             videoTrack.play(ref.current); // Fallback to using ref if no container ID
        // //         }
        
        // //         return () => videoTrack?.stop();
        // //     }, [videoTrack, containerId]);
        
        // //     return <div ref={ref} style={style}></div>;
        // // };
        
        
        // // async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
        // //   const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        
        // //   const client = AgoraRTC.createClient({
        // //       mode: "rtc",
        // //       codec: "vp8",
        // //   });
        
        // //   await client.join(
        // //       process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        // //       roomId,
        // //       token,
        // //       userId
        // //   );
        
          
        // //   const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
          
        // // //   microphoneTrack.setEnabled(false);
          
        // //   setMyVideo(cameraTrack);
        
        // //   await client.publish([microphoneTrack, cameraTrack]);
        
        // //     microphoneTrackRef.current = microphoneTrack;
          
        
        // //   client.on("user-published", async (user, mediaType) => {
        // //       await client.subscribe(user, mediaType);
        // //       if (mediaType === "video") {
        // //           setThemVideo(user.videoTrack);
        // //       }
        // //      else if (mediaType === "audio") {
        // //         // Play the remote audio track when available
        // //         user.audioTrack.play();
        // //     }
              
        // //   });
        
        // //   return { microphoneTrack, cameraTrack, client };
        // // }
        
        
        
        
        // async function connectToAgoraRtm(
        //     roomId: string,
        //     userId: string,
        //     onMessage: (message: TMessage) => void,
        //     token: string
        // ) {
        //     const { default: AgoraRTM } = await import("agora-rtm-sdk");
        //     const client = AgoraRTM.createInstance(process.env.NEXT_PUBLIC_AGORA_APP_ID!);
        //     await client.login({
        //         uid: userId,
        //         token,
        //     });
        //     const channel = client.createChannel(roomId);
        //     await channel.join();
        //     channel.on("ChannelMessage", (message, userId) => {
        //         onMessage({
        //             userId,
        //             message: message.text,
        //         });
        //     });
        
        //     return {
        //         channel,
        //     };
        // }
        
        // export default function Home() {
          
        //   // Add a state to manage video enable/disable status
        //     const microphoneTrackRef = useRef<IAudioTrack | null>(null);
        //     const cameraTrackRef = useRef<ICameraVideoTrack | null>(null);
        //     const [isVideoEnabled, setIsVideoEnabled] = useState(true);
        //     const [isMicEnabled, setIsMicEnabled] = useState(true);
        //     const microphoneTrack = useRef<IAudioTrack>(); // Declare the microphoneTrack variable
        //     //const [partnerVideoAvailable, setPartnerVideoAvailable] = useState(false);
        //     const [showNext, setShowNext] = useState(false);
        //     const [showMainMenu, setShowMainMenu] = useState(false);
        //     const [userId, setUserId] = useState("");
        //     const [room, setRoom] = useState<Room | undefined>();
        //     const [messages, setMessages] = useState<TMessage[]>([]);
        //     const [input, setInput] = useState("");
        //     //const [themVideo, setThemVideo] = useState<IRemoteVideoTrack>();
        //     const [partnerVideoAvailable, setPartnerVideoAvailable] = useState(false);
        //     const [themVideo, setThemVideo] = useState<IRemoteVideoTrack | null>(null);
        //     const [myVideo, setMyVideo] = useState<ICameraVideoTrack>();
        //     const [themAudio, setThemAudio] = useState<IRemoteAudioTrack>();
        //     const channelRef = useRef<RtmChannel>();
        //     const rtcClientRef = useRef<IAgoraRTCClient>();
        //     const { data: session } = useSession();
        //     const canChat = session?.user?.fluentLanguages && session?.user?.practiceLanguage &&
        //         session.user.practiceLanguage !== '';
        //     const [userPreferences, setUserPreferences] = useState({
        //         fluentLanguages: {},
        //         practiceLanguage: '',
        //         partnerLanguagePreference: '',
        //         partnerPreferenceOption: '',
        //     });
            
        //     // useEffect(() => {
        //     //     const localVideoContainer = document.getElementById('local-video-container');
        //     //     const partnerVideoContainer = document.getElementById('partner-video-container');
              
        //     //     if (!localVideoContainer || !partnerVideoContainer) return;
              
        //     //     // Update the local video display
        //     //     if (isVideoEnabled) {
        //     //       if (cameraTrackRef.current) {
        //     //         cameraTrackRef.current.play(localVideoContainer);
        //     //       }
        //     //     } else {
        //     //       localVideoContainer.innerHTML = 'Your video is not available';
        //     //     }
              
        //     //     // Update the partner video display
        //     //     if (partnerVideoAvailable && themVideo) {
        //     //       themVideo.play(partnerVideoContainer);
        //     //     } else {
        //     //       partnerVideoContainer.innerHTML = 'Partner\'s video is not available';
        //     //     }
        //     //   }, [isVideoEnabled, partnerVideoAvailable, themVideo]);
              
        
        //     useEffect(() => {
        //         const fetchPreferences = async () => {
        //             if (session?.user?.id) {
        //               setUserId(session.user.id);
        //                 try {
        //                     const response = await fetch(`/api/user/${session.user.id}/preferences`);
        //                     if (response.ok) {
        //                         const data = await response.json();
        //                         setUserPreferences({
        //                             fluentLanguages: data.fluentLanguages,
        //                             practiceLanguage: data.practiceLanguage,
        //                             partnerLanguagePreference: data.partnerLanguagePreference,
        //                             partnerPreferenceOption: data.partnerPreferenceOption,
        //                         });
        //                     }
        //                 } catch (error) {
        //                     console.error('Error fetching user preferences:', error);
        //                 }
        //             }
        //         };
        //         fetchPreferences();
        //     }, [session]);
        
        //     useEffect(() => {
        //         // Function to call when user attempts to leave the page
        //         const handleBeforeUnload = (event) => {
        //           // Trigger the stop chatting logic
        //           handleStopChatting();
        //           // For beforeunload, you may need to set returnValue to trigger the confirmation dialog
        //           // However, using it to ensure cleanup logic runs may not be reliable for all scenarios
        //           event.preventDefault();
        //           event.returnValue = ''; // Chrome requires returnValue to be set
        //         };
        
        //         const handlePopState = () => {
        //             // Handle the case where a user navigates away using the browser's navigation buttons
        //             handleStopChatting();
        //           };
            
        //         // Add event listener for leaving/closing the page
        //         window.addEventListener('beforeunload', handleBeforeUnload);
        //         window.addEventListener('popstate', handlePopState);
            
        //         // Cleanup function to remove the event listener
        //         return () => {
        //           window.removeEventListener('beforeunload', handleBeforeUnload);
        //           window.removeEventListener('popstate', handlePopState);
        //         };
        //       }, [room, handleStopChatting]); // Add dependencies as needed
        
        //       useEffect(() => {
        //         const channel = channelRef.current;
        //         if (channel) {
        //             channel.on("ChannelMessage", (receivedMsg, senderId) => {
        //                 const message = JSON.parse(receivedMsg.text);
            
        //                 // Handle system message for user leaving
        //                 if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
        //                     // Clear chat for all users
        //                     setMessages([]);
        //                 } else if (message.type !== "SYSTEM") {
        //                     // Handle regular chat messages
        //                     // setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.message }]);
        //                 }
        //             });
        //         }
            
        //         return () => {
        //             if (channel) {
        //                 channel.removeAllListeners();
        //             }
        //         };
        //     }, []);
        
            
        
        //     useEffect(() => {
        //   const chatBox = document.querySelector('.chat-panel');
        //   // Ensure the chatBox element exists and has loaded
        //   if (chatBox) {
        //     chatBox.scrollTop = chatBox.scrollHeight;
        //   }
        // }, [messages]);
        
        //     // useEffect(() => {
        //     //     // Function to call when user attempts to leave the page
        //     //     const handleLeavePage = (event) => {
        //     //       event.preventDefault();
        //     //       event.returnValue = ''; // Chrome requires returnValue to be set
        //     //       // Notify the backend that the user is leaving
        //     //       if (room && room._id) {
        //     //         fetch(`/api/rooms/${room._id}/leave`, {
        //     //           method: 'POST',
        //     //           headers: {
        //     //             'Content-Type': 'application/json',
        //     //           },
        //     //           body: JSON.stringify({ userId }), // Ensure you send the correct user ID
        //     //         }).catch(console.error); // Handle errors or logging here
        //     //       }
        //     //     };
            
        //     //     // Add event listener for leaving/closing the page
        //     //     window.addEventListener('beforeunload', handleLeavePage);
            
        //     //     // Cleanup function to remove the event listener
        //     //     return () => {
        //     //       window.removeEventListener('beforeunload', handleLeavePage);
        //     //     };
        //     //   }, [room, userId]);
            
        
        
        // async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
        //     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
          
        //     const client = AgoraRTC.createClient({
        //         mode: "rtc",
        //         codec: "vp8",
        //     });
        //     const isEnabled = await microphoneTrackRef.current?.getEnabled();
        //     if (isEnabled !== undefined) { // Check if isEnabled is not undefined
        //     await microphoneTrackRef.current?.setEnabled(!isEnabled);
        // }
        //     await client.join(
        //         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        //         roomId,
        //         token,
        //         userId
        //     );
          
        //     // Create microphone and camera tracks
        //     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        //     microphoneTrackRef.current = microphoneTrack; // Assign the track to the ref
        //     cameraTrackRef.current = cameraTrack;
        //     setMyVideo(cameraTrack);
          
        //     // Publish the local audio and video tracks to the channel
        //     await client.publish([microphoneTrack, cameraTrack]);
          
        //     client.on("user-published", async (user, mediaType) => {
        //         // Subscribe to the remote user when they publish
        //         await client.subscribe(user, mediaType);
                
        //         if (mediaType === "video") {
        //             // Play the remote video track when available
        //             setThemVideo(user.videoTrack);
        //             setPartnerVideoAvailable(true); // Update state to indicate partner's video is available
        //         } else if (mediaType === "audio") {
        //             // Play the remote audio track when available
        //             user.audioTrack.play();
        //         }
        //     });
        
        //       // Event listener for when a remote user unpublishes their video track
        //   client.on("user-unpublished", (user, mediaType) => {
        //     if (mediaType === "video") {
        //         setPartnerVideoAvailable(false);
        //         // Optionally reset the themVideo state or handle it differently
        //         //setThemVideo(null);
        //     }
        // });
        
            
          
        //     return { microphoneTrack, cameraTrack, client };
        //   }
        
          
          
        
        // const onMessage = (receivedMsg, senderId) => {
        //     const message = JSON.parse(receivedMsg.text);
        
        //     // Log received message for debugging
        //     console.log("Received message:", message);
        
        //     if (message.type === "SYSTEM" && message.content === "USER_LEFT") {
        //         // Handle system message without updating the chat messages state
        //         console.log("System message for user leaving received:", message.userId);
        //         if (message.userId !== userId) {
        //             // Logic to handle if another user left, if needed
        //         }
        //     } else {
        //         // Add non-system messages to the chat
        //         setMessages(prevMessages => [...prevMessages, { userId: senderId, message: message.content }]);
        //     }
        // };
        
        // // const toggleMicrophone = async () => {
        // //     // if (microphoneTrackRef.current) {
        // //       const isEnabled = await microphoneTrackRef.current.getEnabled();
        // //       await microphoneTrackRef.current.setEnabled(!isEnabled);
        // //     //}
        // //   };
          
        
          
        // // const toggleMicrophone = async () => {
        // //     const newMicStatus = !isMicEnabled; // Determine the new status
        // //     setIsMicEnabled(newMicStatus); // Update the state
        
        // //     // Assuming microphoneTrack is your local microphone track
        // //     if (microphoneTrack.current) { // Access the current value of microphoneTrack
        // //         await microphoneTrack.current.setEnabled(newMicStatus); // Use the current value of microphoneTrack
        // //     }
        // // };
          
        
        
        // //   const toggleVideo = async () => {
        // //       if (myVideo) {
        // //           await myVideo.setEnabled(!isVideoEnabled);
        // //           setIsVideoEnabled(!isVideoEnabled);
        // //       }
        // //   };
        
        
        // const toggleVideo2 = async () => {
        //     const isEnabled = isVideoEnabled;
        //     if (!isEnabled) {
        //         // If video is currently off, enable it and publish
        //         if (cameraTrackRef.current) {
        //             await cameraTrackRef.current.setEnabled(true);
        //             setIsVideoEnabled(true);
        //             setMyVideo(cameraTrackRef.current);
        //             //cameraTrackRef.current.play('local-video-container'); // Ensure this is your video container ID
        //             await rtcClientRef.current?.publish(cameraTrackRef.current);
        //         }
        //     } else {
        //         // If video is currently on, disable it and unpublish
        //         if (cameraTrackRef.current) {
        //             await rtcClientRef.current?.unpublish(cameraTrackRef.current);
        //             cameraTrackRef.current.stop();
        //         }
        //     }
        //     setIsVideoEnabled(!isEnabled); // Toggle the video enabled state
        // };
        
        // const toggleVideo = async () => {
        //     if (cameraTrackRef) {
        //       await cameraTrackRef.current?.setEnabled(!isVideoEnabled);
        //       setIsVideoEnabled(!isVideoEnabled);
        //     }
        // };
        // // const toggleVideo = async () => {
        // //     if (!cameraTrackRef.current || !rtcClientRef.current) return;
          
        // //     const isEnabled = isVideoEnabled; // Current video state
          
        // //     if (isEnabled) {
        // //       await rtcClientRef.current.unpublish(cameraTrackRef.current); // Unpublish the video track
        // //       cameraTrackRef.current.stop(); // Stop the camera
        // //       setIsVideoEnabled(false); // Update UI state
        // //     } else {
        // //       // Ensure the track is enabled and then play it
        // //       await cameraTrackRef.current.setEnabled(true);
        // //       cameraTrackRef.current.play('local-video-container');
        // //       await rtcClientRef.current.publish(cameraTrackRef.current); // Republish the video track
        // //       setIsVideoEnabled(true); // Update UI state
        // //     }
        // //   };
          
          
        
        //   const toggleMicrophone = async () => {
        //     if (microphoneTrack) {
        //       await microphoneTrackRef.current?.setEnabled(!isMicEnabled);
        //       setIsMicEnabled(!isMicEnabled);
        //     }
        // };
          
        
        //     //   const toggleVideo = async () => {
        //     //     setIsVideoEnabled(!isVideoEnabled); // Toggle the state
        //     //     if (myVideo) {
        //     //         await myVideo.setEnabled(isVideoEnabled); // Use the updated state
        //     //     }
        //     // };
          
        
        //     // Check if all necessary preferences are set
        //     const canStartChatting = () => {
        //         const hasFluentLanguage = Object.values(userPreferences.fluentLanguages).some(value => value);
        //         const hasPracticeLanguage = userPreferences.practiceLanguage !== '';
        //         return hasFluentLanguage && hasPracticeLanguage;
        //     };
        
        //     const formatStrangerPreference = () => {
        //         switch (userPreferences.partnerPreferenceOption) {
        //             case 'specific':
        //                 return userPreferences.partnerLanguagePreference;
        //             case 'languageImPracticing':
        //                 return userPreferences.practiceLanguage;
        //             case 'any':
        //                 const fluentLanguagesList = Object.keys(userPreferences.fluentLanguages)
        //                     .filter(lang => userPreferences.fluentLanguages[lang])
        //                     .join(', ');
        //                 return fluentLanguagesList.length > 1 ? `one of: ${fluentLanguagesList}` : fluentLanguagesList;
        //             default:
        //                 return 'N/A';
        //         }
        //     };
        
        //     useEffect(() => {
        //         console.log("Current Messages:", messages);
        //       }, [messages]); // This will log messages state every time it changes
        
        //     async function handleStopChatting() {
        //         if (room) {
                    
        //             // Leave the Agora RTC channel
        //             if (rtcClientRef.current) {
        //                 rtcClientRef.current.leave();
        //                 rtcClientRef.current = null;
        //             }
        
        //             // Stop the local video and audio tracks
        //             if (myVideo) {
        //                 myVideo.stop();
        //                 myVideo.close();
        //                 setMyVideo(null);
        //             }
        
        //             if (themVideo) {
        //                 themVideo.stop();
        //                 themVideo.close();
        //                 setThemVideo(null);
        //             }
        
        //             // Update room status to 'waiting' in the database
        //             // await setRoomToWaiting(room._id);
        //             console.log("UserID being sentttt:", userId);
                    
        //             try {
        //                 const response = await fetch(`/api/rooms/${[room._id]}`, {
        //                   method: 'PUT',
        //                   headers: {
        //                     'Content-Type': 'application/json',
        //                   },
        //                   body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
                          
        //                 });
        //                 if (!response.ok) {
        //                   throw new Error('Failed to update room status');
        //                 }
        //                 // Handle success
        //                 console.log("Successfully left the room");
        //               } catch (error) {
        //                 console.error("Error leaving room:", error);
        //               }
                    
        //             // Reset the room and message state
        //             // setRoom(undefined);
        //             if (channelRef.current && userId) {
        //                 const systemMessage = JSON.stringify({
        //                     type: "SYSTEM",
        //                     content: "USER_LEFT",
        //                     userId: userId
        //                 });
        //                 await channelRef.current.sendMessage({ text: systemMessage });
        //             }
        //             console.log("Clearing messages"); // Debugging
        //             setMessages([]); // Clear messages
        //             console.log("Messages after clearing:", messages); // This might still show old messages due to async state update
        //             setRoom(undefined);
        
        //             // Show 'Next' and 'Back to Main Menu' buttons
        //             setShowNext(true);
        //             setShowMainMenu(true);
        //         }
        //     }
        
        //     function handleNextClick() {
        //         setShowNext(false);
        //         setShowMainMenu(false);
        //         connectToARoom();
        //     }
        
        //     function handleBackToMainMenu() {
        //         // Redirect to the main page
        //         window.location.href = '/';
        //     }
        
        //     function handleStartChattingClicked() {
        //         console.log("Start Chatting Clicked");
        //         setShowNext(false);
        //         setShowMainMenu(false);
        //         connectToARoom();
        //     }
        
        //     async function handleSubmitMessage(e: React.FormEvent) {
        //         e.preventDefault();
        //         await channelRef.current?.sendMessage({
        //             text: input,
        //         });
        //         setMessages((cur) => [
        //             ...cur,
        //             {
        //                 userId,
        //                 message: input,
        //             },
        //         ]);
        //         setInput("");
        //     }
        
        //     const handleLeaveRoom = async () => {
        //         // Example API call to update room status
        //         try {
        //             const response = await fetch(`/api/rooms/${roomId}`, {
        //               method: 'PUT',
        //               headers: {
        //                 'Content-Type': 'application/json',
        //               },
        //               body: JSON.stringify({ userId }), // Sending the user ID of the leaving user
        //             });
        //             if (!response.ok) {
        //               throw new Error('Failed to update room status');
        //             }
        //             // Handle success
        //             console.log("Successfully left the room");
        //           } catch (error) {
        //             console.error("Error leaving room:", error);
        //           }
        //         }
        //     async function handleLeaveChattingRoom() {
        //         // ... logic to disconnect from the room ...
        
        //         if (room && room.status === "chatting") {
        //             await fetch(`/api/rooms/${room._id}`, {
        //                 method: 'PUT',
        //                 // Include any necessary headers, body, etc.
        //             });
        //             // Handle the response as needed
        //         }
        
        //         // ... additional logic for UI updates, navigation, etc.
        //     }
            
        
            
        
        //     async function connectToARoom() {
        //         console.log("Connecting to a room");
        //         setThemAudio(undefined);
        //         setThemVideo(undefined);
        //         setMyVideo(undefined);
        //         setMessages([]);
        //         setShowNext(false);
        //         setShowMainMenu(false);
        
        
        //         // NEw VERSION 1.24
        //         let partnerLanguageArray;
        
        //         if (userPreferences.partnerPreferenceOption === 'specific') {
        //             partnerLanguageArray = [userPreferences.partnerLanguagePreference];
        //         } else if (userPreferences.partnerPreferenceOption === 'languageImPracticing') {
        //             partnerLanguageArray = [userPreferences.practiceLanguage];
        //         } else {
        //             partnerLanguageArray = Object.keys(userPreferences.fluentLanguages)
        //                                         .filter(lang => userPreferences.fluentLanguages[lang]);
        //         }
            
        
              
        //     if (!session.user.id) {
        //       console.error('User ID is undefined');
        //       return; // Exit the function if userId is not available
        //     }
          
        //     const userPreferencesToSend = {
        //       practiceLanguage: userPreferences.practiceLanguage,
        //       partnerLanguage: partnerLanguageArray,
        //   };
          
        //     const queryString = new URLSearchParams({
        //       practiceLanguage: userPreferences.practiceLanguage,
        //       partnerLanguage: JSON.stringify(Object.keys(userPreferences.fluentLanguages).filter(lang => userPreferences.fluentLanguages[lang])),
        //       userId: userId,
        //     }).toString();
          
        //     console.log("UserID being sentttt:", userId);
        //     // const response = await fetch(`/api/rooms?practiceLanguage=${userPreferencesToSend.practiceLanguage}&partnerLanguage=${JSON.stringify(userPreferencesToSend.partnerLanguage)}&userId=${userId}`);
        
        //     // Old version
        //   //   const userPreferencesToSend = {
        //   //     practiceLanguage: userPreferences.practiceLanguage,
        //   //     partnerLanguage: userPreferences.partnerPreferenceOption === 'specific'
        //   //         ? [userPreferences.partnerLanguagePreference]
        //   //         : userPreferences.partnerPreferenceOption === 'languageImPracticing'
        //   //         ? [userPreferences.practiceLanguage]
        //   //         : Object.keys(userPreferences.fluentLanguages).filter(lang => userPreferences.fluentLanguages[lang]);
        //   // }
        
        
        //   try {
        //   //   const userPreferencesToSend = {
        //   //     practiceLanguage: userPreferences.practiceLanguage,
        //   //     partnerLanguage: Object.keys(userPreferences.fluentLanguages)
        //   //       .filter(lang => userPreferences.fluentLanguages[lang]),
        //   //   };
        
        //   //   const queryString = new URLSearchParams({
        //   //     practiceLanguage: userPreferencesToSend.practiceLanguage,
        //   //     partnerLanguage: JSON.stringify(userPreferencesToSend.partnerLanguage),
        //   //     // Convert other preferences to query string if needed
        //   // }).toString();
            
        //     const response = await fetch(`/api/rooms?practiceLanguage=${userPreferencesToSend.practiceLanguage}&partnerLanguage=${JSON.stringify(userPreferencesToSend.partnerLanguage)}&userId=${userId}`);
        //     if (!response.ok) {
        //       throw new Error(`Error fetching room: ${response.statusText}`);
        //     }
        //     const { room, rtcToken, rtmToken } = await response.json();
        
        // if (room) {
        //   // Connect to the matched or newly created room
        //   setRoom(room);
        //   await setupRoomConnection(room._id, userId, rtmToken, rtcToken);
        // } else {
          
        //   // This scenario should not happen as backend creates a room if none is found
        //   // But you can handle any unexpected case here
        //   console.error("No room available and unable to create a new one.");
        // }
        //   } catch (error) {
        //     console.error('Error in connectToARoom:', error);
        //   }
        // }
                
        //             async function setupRoomConnection(roomId, userId, rtmToken, rtcToken) {
        //                 const { channel } = await connectToAgoraRtm(
        //                     roomId,
        //                     userId,
        //                     (message: TMessage) => setMessages((cur) => [...cur, message]),
        //                     rtmToken
        //                 );
        //                 channelRef.current = channel;
                
        //                 const { microphoneTrack, cameraTrack, client } = await connectToAgoraRtc(
        //                   roomId, 
        //                   userId, 
        //                   rtcToken, 
        //                   setMyVideo, 
        //                   setThemVideo
        //                 );
        //                 rtcClientRef.current = client;
        //             }
        
        //           //   async function connectToAgoraRtc(roomId, userId, token, setMyVideo, setThemVideo) {
        //           //     const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
                  
        //           //     const client = AgoraRTC.createClient({
        //           //         mode: "rtc",
        //           //         codec: "vp8",
        //           //     });
                  
        //           //     await client.join(
        //           //         process.env.NEXT_PUBLIC_AGORA_APP_ID!,
        //           //         roomId,
        //           //         token,
        //           //         userId
        //           //     );
                  
        //           //     // Create and start the camera and microphone tracks
        //           //     const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                  
        //           //     // Set the local video track for rendering in your component
        //           //     setMyVideo(cameraTrack);
                  
        //           //     // Publish the tracks to the channel
        //           //     await client.publish([microphoneTrack, cameraTrack]);
                  
        //           //     client.on("user-published", async (user, mediaType) => {
        //           //         await client.subscribe(user, mediaType);
        //           //         if (mediaType === "video") {
        //           //             // Set the remote video track for rendering in your component
        //           //             setThemVideo(user.videoTrack);
        //           //         }
        //           //     });
                  
        //           //     return { microphoneTrack, cameraTrack, client };
        //           // }
                  
        //             function convertToYouThem(message: TMessage) {
        //     return message.userId === userId ? "You" : "Them";
        //   }
                
        //             const isChatting = room!!;
        
        //             return (
        //                 <>
        //                     <Head>
        //                         <title>Create Next App</title>
        //                         <meta name="description" content="Generated by create next app" />
        //                         <meta name="viewport" content="width=device-width, initial-scale=1" />
        //                         <link rel="icon" href="/favicon.ico" />
        //                     </Head>
                
        //                     <main 
        //                     className={styles.main}>
        //                         {isChatting ? (
        //                             <>
        //                                 {/* {room._id} */}
        //                                 {showNext ? (
        //                                     <>
        //                                         <button onClick={handleNextClick}>Next</button>
        //                                         <button
        //                                         className="back-to-menu"
        //                                         onClick={handleBackToMainMenu}
                                                
        //                                         >Back to Main Menu</button>
        //                                     </>
        //                                 ) : (
        //                                   <div>
        //                                     <button onClick={handleStopChatting} className="button stop-button">Stop</button>
        //                                     {/* Toggle Video Button */}
        //                         <button onClick={toggleVideo} className="button video-button">
        //                             {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
        //                         </button>
        
        //                         <button onClick={toggleMicrophone} className="button mic-button">
        //                             {isMicEnabled ? "Turn Off Mic" : "Turn On Mic"}
        //                         </button>
                  
        
        //                                     {/* <div>
        //     <button onClick={toggleMicrophone}>
        //         {isMicEnabled ? "Turn Off Mic" : "Turn On Mic"}
        //     </button>
        //     <button onClick={toggleVideo}>
        //         {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
        //     </button>
        // </div> */}
        //                                   </div>
        //                                 )}
        //                                 <div className="chat-window">
        //                                     <div className="video-panel">
        //                                         <div className="video-box" >
        //                                             {myVideo && (
        //                                                 <VideoPlayer
        //                                                     style={{ width: "100%", height: "100%" }}
        //                                                     videoTrack={myVideo}
                                                            
        //                                                 />
        //                                             )}
        //                                         </div>
        //                                         <div>
        //     {/* {partnerVideoAvailable ? ( */}
        //       <div className="video-box">
        //         {/* Render your partner's video here */}
        //         {themVideo && (
        //           <VideoPlayer
        //             videoTrack={themVideo}
        //             style={{ width: "100%", height: "100%" }}
        //           />
        //         )}
        //       </div>
        //     {/* ) : (
        //       <div>No partner video available</div>
        //     )} */}
        //   </div>
        //                                     </div>
        //                                     <div className="chat">
        //                                     <div className="chat-panel" key={messages.length}>
        //                                     <ul>
        //                                         {messages.map((message, idx) => (
        //                                             <li key={idx} className="message">
        //                                                 {convertToYouThem(message)} - {message.message}
        //                                             </li>
        //                                         ))}
        //                                     </ul>
        //                                     </div>
                                            
        //                                         <div className="chat-input-container"> 
        //                                         <form onSubmit={handleSubmitMessage}>
        //                                             <input
        //                                                 value={input}
        //                                                 onChange={(e) => setInput(e.target.value)}
        //                                                 type="text" className="chat-input" placeholder="Type a message..."
        //                                             ></input>
        //                                             <button>Submit</button>
        //                                         </form>
        //                                         </div>
        //                                         </div>
        
                                            
        //                                 </div>
        //                             </>
        //                         ) : (
        //                             <div>
        //                                 {canChat ? (
        //                                     <p>
                                              
        //                                     </p>
        //                                 ) : (
        //                                     <p>
        //                                         You can't start chatting until you set your language preferences, click{' '}
        //                                         <Link href="/language-preferences" className={styles.boldUnderline}>here</Link>.
        //                                     </p>
        //                                 )}
                
        //                                 {canStartChatting() ? (
        //                                     <>
        //                                         <div className="before-chatting-screen">
        //                                         <p>I am going to practice: {userPreferences.practiceLanguage}</p>
        //                                         <p>My partner is going to practice: {formatStrangerPreference()}</p>
        //                                         <button 
        //                                         className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        //                                         onClick={handleStartChattingClicked}>Start Chatting</button>
                                                
        //                                         <button className="back-to-menu" onClick={() => (window.location.href = '/')}>
        //                                             Back to Main Menu
        //                                         </button>
        //                                         </div>
        //                                     </>
        //                                 ) : (
        //                                     <p>
        //                                         Please complete your language preferences to start chatting.
        //                                     </p>
        //                                 )}
                                        
        //                             </div>
        //                         )}
        //                     </main>
        //                 </>
        //             );
        //         };