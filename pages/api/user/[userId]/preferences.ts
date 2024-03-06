// pages/api/user/[userId]/preferences.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../libs/dbConnect';
import User from '../../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { userId },
    method,
    body,
  } = req;

  

  await dbConnect();

  // NEW CODE BELOW

  if (method === 'GET') {
    const { userId } = req.query;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return the relevant preferences
      res.status(200).json({
        fluentLanguages: user.fluentLanguages,
        practiceLanguage: user.practiceLanguage,
        partnerLanguagePreference: user.partnerLanguagePreference,
        partnerPreferenceOption: user.partnerPreferenceOption,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  if (method === 'PUT') {
  try {
    const { fluentLanguages, practiceLanguage, partnerLanguagePreference, partnerPreferenceOption } = body;

    if (!fluentLanguages || !practiceLanguage) {
      return res.status(400).json({ message: 'Missing language preferences' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fluentLanguages, practiceLanguage, partnerLanguagePreference, partnerPreferenceOption},
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }



  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
