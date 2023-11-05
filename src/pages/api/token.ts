import { NextApiRequest, NextApiResponse } from 'next';
import Twilio from 'twilio';

const myFunction = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { identity, roomName } = req.body;

  const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
  const apiKey = process.env.TWILIO_API_KEY as string;
  const apiSecret = process.env.TWILIO_API_SECRET as string;

  const client = Twilio(apiKey, apiSecret, { accountSid });
  const token = new Twilio.jwt.AccessToken(accountSid, apiKey, apiSecret, { identity });
  const videoGrant = new Twilio.jwt.AccessToken.VideoGrant({ room: roomName });
  token.addGrant(videoGrant);

  res.status(200).send({ token: token.toJwt() });
};

export default myFunction;