// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../libs/dbConnect";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { RtmTokenBuilder, RtmRole } from "agora-access-token";
import Room from "../../../models/Room";

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  await dbConnect();
  const { method, query, body } = req;
  const roomId = query.roomId as string;
  const leavingUserId = body.userId;


  // if (req.method === 'POST' && req.url.endsWith('/leave')) {
  //   // Extract roomId and userId from the request, adjust according to your data structure
  //   const { roomId } = req.query; // If using dynamic API routes
  //   const { userId } = req.body; // Assuming the body contains the userId

  //   try {
  //     const room = await Room.findById(roomId);
  //     if (!room) {
  //       return res.status(404).json({ message: "Room not found" });
  //     }

  //     // Logic to handle user leaving, e.g., update room status, remove user from room, etc.
  //     // This is an example, adapt it to your application logic
  //     if (room.status === "chatting") {
  //       // Example: mark user1 as left, adjust as necessary
        
  //       room.user1 = null;
  //       room.status = "waiting"; // or handle as per your logic
  //       await room.save();
        
  //     }
  //     // Repeat for other user(s) or statuses as needed

  //     return res.status(200).json({ message: "User left room, room updated" });
  //   } catch (error) {
  //     console.error("Error handling user leaving:", error);
  //     return res.status(500).json({ message: "Error updating room on user leave" });
  //   }
  // }

  if (method == "PUT") {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        
        }
  
      
        console.log("Leaving User Id part 2: ", leavingUserId);
        if (room.status === "chatting") {
          console.log("Leaving User Id part 3: ", leavingUserId);
          console.log("User 1: ", room.user1);
          console.log("User 2: ", room.user2);
          // // Check if another user remains in the room
          // if ((room.user1 && room.user1 !== leavingUserId) || (room.user2 && room.user2 !== leavingUserId)) {
            room.status = "waiting";
            // If user1 is leaving, check if user2 exists to keep the room in waiting
            if (room.user1.toString() === leavingUserId) {
              console.log("Leaving User Id: ", leavingUserId);
              room.user1 = room.user2;
              room.user1Preferences = room.user2Preferences;
              room.user2 = null;
              room.user2Preferences = {}; // Optionally clear user2's preferences if needed
              await room.save();
            } else if (room.user2.toString() === leavingUserId) {
              console.log("Leaving User Id: ", leavingUserId);
              room.user2 = null;
              room.user2Preferences = {}; // Clear user2's data since they're leaving
              await room.save();
            }
            // No need to delete the room, just update it to waiting
            await room.save();
            return res.status(200).json({ message: "Room status updated to waiting" });
          } else if (room.status === "waiting") {
            await room.remove();
            return res.status(200).json({ message: "Room deleted successfully" });
          }
          else {
            // Handle unsupported methods
            res.setHeader("Allow", ["PUT"]);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
          }
        } catch (error) {
          return res.status(500).json({ message: "Error updating room: " + error });
        }
  }
}
