
import mongoose from 'mongoose';

const appSchema = new mongoose.Schema({
  name: { type: String, required: true },
  installCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 }
});

const App = mongoose.model('App', appSchema);

export default App;
