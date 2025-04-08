import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctors',
    required: true
  },
  day: {
    type: String,
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['scheduled', 'leave', 'holiday'],
    default: 'scheduled'
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  slots: [{
    time: String,
    duration: Number
  }],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

export default Schedule; 