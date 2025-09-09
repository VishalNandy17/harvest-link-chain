import dotenv from 'dotenv';
dotenv.config();

export const config = {
  RPC_URL: process.env.RPC_URL || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  MONGO_URI: process.env.MONGO_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  API_BASE_URL: process.env.API_BASE_URL || '',
};
