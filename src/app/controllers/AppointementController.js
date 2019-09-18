import * as Yup from 'yup';
import Appointement from '../models/Appointement';
import User from '../models/User';

class AppointementController {
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    // Check if provider is a provider
    if (!isProvider) {
      return res.status(401).json({
        error: 'You can only create appointments with providers',
      });
    }

    const appointments = await Appointement.create({
      user_id: req.user_id,
      provider_id,
      date,
    });

    return res.json(appointments);
  }
}
export default new AppointementController();
