import mongoose, { Schema, Document } from 'mongoose';

export interface IEventLog extends Document {
  event: string;
  batchId: string;
  payload: any;
  at: Date;
}

const EventLogSchema = new Schema({
  event: { type: String, required: true },
  batchId: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  at: { type: Date, default: Date.now }
});

export default mongoose.model<IEventLog>('EventLog', EventLogSchema);
