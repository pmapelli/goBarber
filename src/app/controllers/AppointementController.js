import * as Yup from 'yup';
import pt from 'date-fns/locale/pt';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import Appointement from '../models/Appointement';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

class AppointementController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointement.findAll({
      where: { user_id: req.userId, canceled_at: null },
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      order: ['date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

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

    const hourStart = startOfHour(parseISO(date));

    // Check for past date
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    // Check date availability
    const checkAvailability = await Appointement.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointement date is not available' });
    }

    const appointment = await Appointement.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    // Notify appointement provider
    const user = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às ' H:mm'h'",
      { locale: pt }
    );

    console.log(user.name);
    console.log(formattedDate);
    console.log(provider_id);

    await Notification.create({
      content: `Novo agendamento de ${user.name} para o ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }
}

export default new AppointementController();
