import mongoose from 'mongoose';

let isConnected = false; // Track the connection

export const connectToDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);

  if (isConnected) {
    console.log('MongoDB is already connected');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: "share_prompt",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions); // Add 'as mongoose.ConnectOptions' to specify the correct type

    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log('An unknown error occurred during MongoDB connection');
    }
  }
};
