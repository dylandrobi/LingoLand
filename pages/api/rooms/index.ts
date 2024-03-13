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