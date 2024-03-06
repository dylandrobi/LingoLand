import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../libs/dbConnect';
import User from '../../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { userId } = req.query;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ fluentLanguages: user.fluentLanguages });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
}