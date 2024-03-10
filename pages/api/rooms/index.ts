//Next.js API route support: https://nextjs.org/docs/api-routes/introduction
//pages/api/rooms/index.ts

// import type { NextApiRequest, NextApiResponse } from "next";
// import dbConnect from "../../../libs/dbConnect";
// import { RtcTokenBuilder, RtmTokenBuilder, RtmRole, RtcRole } from "agora-access-token";
// import Room from "../../../models/Room";
// import User from "../../../models/User"; // import the User model

// // ... (Other types and function definitions)

// export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
//   const { method, query } = req;
//   const userId = query.userId as string;

//   await dbConnect();

//   if (method === "GET") {
//     try {
//       // Fetch the current user's language preferences
//       const currentUser = await User.findById(userId);
//       if (!currentUser) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       const { fluentLanguage, practiceLanguage } = currentUser;

//       // Find a room with a user whose fluent language matches the current user's practice language
//       const rooms = await Room.aggregate([
//         { $match: { status: "waiting" } },
//         { $lookup: {
//             from: "users", // assuming your user collection is named 'users'
//             localField: "userId", // field in the rooms collection
//             foreignField: "_id", // field in the users collection
//             as: "user"
//           }
//         },
//         { $match: {
//             "user.fluentLanguage": practiceLanguage,
//             "user.practiceLanguage": fluentLanguage
//           }
//         },
//         { $sample: { size: 1 } }
//       ]);

//       if (rooms.length > 0) {
//         const roomId = rooms[0]._id.toString();
//         await Room.findByIdAndUpdate(roomId, { status: "chatting" });
//         res.status(200).json({
//           rooms,
//           rtcToken: getRtcToken(roomId, userId),
//           rtmToken: getRtmToken(userId),
//         });
//       } else {
//         // No matching rooms, create a new one
//         const room = await Room.create({ status: "waiting" });
//         res.status(200).json({
//           room,
//           rtcToken: getRtcToken(room._id.toString(), userId),
//           rtmToken: getRtmToken(userId),
//         });
//       }
//     } catch (error) {
//       res.status(400).json({ message: error.message });
//     }
//   } else if (method === "POST") {
//     // ... Your existing POST logic
//   } else {
//     res.status(400).json("no method for this endpoint");
//   }
// }



//OG WORKING CODE
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../libs/dbConnect";
import { RtcTokenBuilder, RtmTokenBuilder, RtmRole, RtcRole } from "agora-access-token";
import Room from "../../../models/Room";
import User from "../../../models/User";
type Room = {
  status: String;
};

type ResponseData = Room[] | string;

function getRtmToken(userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const account = userId;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtmTokenBuilder.buildToken(
    appID,
    appCertificate,
    account,
    RtmRole.Rtm_User,
    privilegeExpiredTs
  );
  return token;
}

function getRtcToken(roomId: string, userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const channelName = roomId;
  const account = userId;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithAccount(
    appID,
    appCertificate,
    channelName,
    account,
    role,
    privilegeExpiredTs
  );

  return token;
}

// Assuming Room model has been appropriately defined to include user preferences
async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  await dbConnect();

  if (req.method === "GET") {
      try {
          const { practiceLanguage, partnerLanguage, userId } = req.query;
          const partnerLanguages = JSON.parse(partnerLanguage as string);

          // Find a matching room or create a new one
          const matchingRoom = await Room.findOneAndUpdate(
              {
                  status: "waiting",
                  "user1Preferences.practiceLanguage": { $in: partnerLanguages },
                  "user1Preferences.partnerLanguage": practiceLanguage,
              },
              {
                  status: "chatting",
                  user2: userId,
                  $set: {
                      "user2Preferences": {
                          practiceLanguage: practiceLanguage,
                          partnerLanguage: partnerLanguages,
                      }
                  }
              },
              { new: true }
          );

          if (matchingRoom) {
              // Matching room found and updated
              res.status(200).json({
                  room: matchingRoom,
                  rtcToken: getRtcToken(matchingRoom._id.toString(), userId?.toString() ?? ""),
                  rtmToken: getRtmToken(userId?.toString() ?? ""),
              });
          } else {
              // No matching room found, create a new one
            const newRoom = await Room.create({
                status: "waiting",
                user1Preferences: {
                    practiceLanguage: practiceLanguage,
                    partnerLanguage: partnerLanguages,
                },
                // Assuming a mechanism to link the room to the user who created it
                user1: userId,
            });

            res.status(200).json({
                room: newRoom,
                rtcToken: getRtcToken(newRoom._id.toString(), userId?.toString() ?? ""),
                rtmToken: getRtmToken(userId?.toString() ?? ""),
            });
          }
      } catch (error) {
          console.error("Error in matching or creating room:", error);
          res.status(500).json({ message: "Internal server error" });
      }
  } else {
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default handler;


  //...remaining code...

      

      // } else {
          // Find any waiting room if no match is found





      //     const randomRoom = await Room.aggregate([
          //   { $match: { status: "waiting" } },
          //   { $sample: { size: 1 } },
          // ]);
          // if (randomRoom.length > 0) {
          //   const roomId = randomRoom[0]._id.toString();
          //   await Room.findByIdAndUpdate(roomId, { status: "chatting" });
          //   res.status(200).json({
          //     room: randomRoom[0],
          //     rtcToken: getRtcToken(roomId, userId),
          //     rtmToken: getRtmToken(userId),
          //   });
          // } else {
          //   res.status(200).json({ room: null, rtcToken: null, rtmToken: null });
          // }




      
          // case "POST":
          //   try {
          //     // You can adjust the room creation here to include more details if needed
          //     const newRoom = await Room.create({
          //       status: "waiting",
          //       // Add other fields as necessary, like user preferences
          //     });
          //     return res.status(200).json({
          //       room: newRoom,
          //       rtcToken: getRtcToken(newRoom._id.toString(), req.query.userId as string),
          //       rtmToken: getRtmToken(req.query.userId as string),
          //     });
          //   } catch (error) {
          //     return res.status(500).json({ message: (error as Error).message });
          //   }
          


        // if (room) {
        //   // Update room status and add second user's preferences
        //   const updatedRoom = await Room.findByIdAndUpdate(
        //     room._id,
        //     { 
        //       status: "chatting",
        //       user2Preferences: {
        //         practiceLanguage: practiceLanguage,
        //         partnerLanguage: partnerLanguages
        //       }
        //     },
        //     { new: true }
        //   );
        //   res.status(200).json({
        //     room: updatedRoom,
        //     rtcToken: getRtcToken(updatedRoom._id.toString(), userId),
        //     rtmToken: getRtmToken(userId),
        //   });
        // } 


        // if (matchedRoom) {
        //   // Update the room status to 'chatting'
        //   await Room.findByIdAndUpdate(matchedRoom._id, { status: "chatting" });
        //   res.status(200).json({
        //     room: matchedRoom,
        //     rtcToken: getRtcToken(matchedRoom._id.toString(), userId),
        //     rtmToken: getRtmToken(userId),
        //   });
        // } else {
          // Find any waiting room if no match is found





      //     const randomRoom = await Room.aggregate([
          //   { $match: { status: "waiting" } },
          //   { $sample: { size: 1 } },
          // ]);
          // if (randomRoom.length > 0) {
          //   const roomId = randomRoom[0]._id.toString();
          //   await Room.findByIdAndUpdate(roomId, { status: "chatting" });
          //   res.status(200).json({
          //     room: randomRoom[0],
          //     rtcToken: getRtcToken(roomId, userId),
          //     rtmToken: getRtmToken(userId),
          //   });
          // } else {
          //   res.status(200).json({ room: null, rtcToken: null, rtmToken: null });
          // }
        
      // } catch (error) {
      //   res.status(500).json({ message: (error as Error).message });
      // }
      // break;

      
//     case "POST":
//       try {
//         // Create a new room with 'waiting' status
//         const room = await Room.create({
//           status: "waiting",
//           user1Preferences: {
//             practiceLanguage: req.body.practiceLanguage,
//             partnerLanguage: req.body.partnerLanguage
//           }
//         });
//         res.status(200).json({
//           room,
//           rtcToken: getRtcToken(room._id.toString(), userId),
//           rtmToken: getRtmToken(userId),
//         });
//       } catch (error) {
//         res.status(500).json({ message: (error as Error).message });
//       }
//       break;

//     default:
//       res.status(405).json({ message: `Method ${method} Not Allowed` });
//       break;
//   }
// }

//VERSION 1.25

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<any>
// ) {
//   const { method, query } = req;
//   const userId = query.userId as string;

//   await dbConnect();

//   switch (method) {
//     case "GET":
//       try {
//          // Extract user preferences from the query
//       const userPracticeLanguage = req.query.practiceLanguage as string;
//       const userPartnerLanguages = JSON.parse(req.query.partnerLanguage as string) as string[];
      
//         const rooms = await Room.aggregate([
//           { $match: { status: "waiting" } },
//           { $sample: { size: 1 } },
//         ]);
//         if (rooms.length > 0) {
//           const roomId = rooms[0]._id.toString();
//           await Room.findByIdAndUpdate(roomId, {
//             status: "chatting",
//           });
//           res.status(200).json({
//             rooms,
//             rtcToken: getRtcToken(roomId, userId),
//             rtmToken: getRtmToken(userId),
//           });
//         } else {
//           res.status(200).json({ rooms: [], token: null });
//         }
//       } catch (error) {
//         res.status(400).json((error as any).message);
//       }
//       break;
//     case "POST":
//       const room = await Room.create({
//         status: "waiting",
//       });
//       res.status(200).json({
//         room,
//         rtcToken: getRtcToken(room._id.toString(), userId),
//         rtmToken: getRtmToken(userId),
//       });
//       break;
//     default:
//       res.status(400).json("no method for this endpoint");
//       break;
//   }
// }


//New attempt 1:

// pages/api/rooms/index.ts

// export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
//     const { method, query } = req;
//     const userId = query.userId as string;

//     await dbConnect();

//     if (method === "GET") {
//         try {
//             // Fetch the current user's language preferences
//             const currentUser = await User.findById(userId);
//             if (!currentUser) {
//                 return res.status(404).json({ message: "User not found" });
//             }
            
//             const fluentLanguage = currentUser.fluentLanguage;
//             const practiceLanguage = currentUser.practiceLanguage;

//             // Find a room with a user who wants to practice the current user's fluent language
//             const rooms = await Room.aggregate([
//                 { $match: { status: "waiting" } },
//                 { 
//                     $lookup: {
//                         from: "users",
//                         localField: "occupant", 
//                         foreignField: "_id",
//                         as: "occupant_info",
//                     }
//                 },
//                 { 
//                     $match: {
//                         "occupant_info.fluentLanguage": practiceLanguage,
//                         "occupant_info.practiceLanguage": fluentLanguage,
//                     }
//                 },
//                 { $sample: { size: 1 } }
//             ]);

//             if (rooms.length > 0) {
//               const roomId = rooms[0]._id.toString();
//               await Room.findByIdAndUpdate(roomId, {
//                 status: "chatting",
//            });
//               res.status(200).json({
//                 rtcToken: getRtcToken(roomId, userId),
//                 rtmToken: getRtmToken(userId),
//            });
//          } else {
//                 res.status(200).json({ rooms: [], token: null });
//          }
//        }        catch (error) {
//                 res.status(400).json((error as any).message);
//        }
//     } else if (method === "POST") {
//                 try {
//                 // Create a room and add the current user as its occupant
//                 const room = await Room.create({
//                 status: "waiting",
//                 occupant: userId, // Store the user's ID as the room's occupant
//             });
//                 res.status(200).json({
//                 rtcToken: getRtcToken(room._id.toString(), userId),
//                 rtmToken: getRtmToken(userId),
//             });

//             // ... existing logic for room creation response
//         }       catch (error) {
//                 res.status(400).json({ message: (error as Error).message });
//         }
//     } else {
//         res.status(400).json("no method for this endpoint");
//     }
// }
