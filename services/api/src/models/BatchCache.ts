import mongoose, { Schema, Document } from 'mongoose';

export interface IBatchCache extends Document {
  batchId: string;
  data: any;
  updatedAt: Date;
}

const BatchCacheSchema = new Schema({
  batchId: { type: String, required: true, unique: true },
  data: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IBatchCache>('BatchCache', BatchCacheSchema);
