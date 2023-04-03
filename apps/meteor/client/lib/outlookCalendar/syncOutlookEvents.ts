/* eslint-disable new-cap */
import { APIClient } from '../../../app/utils/client/lib/RestApiClient';
import { getOutlookEvents } from './getOutlookEvents';

export const syncOutlookEvents = async (date: Date, server: string, token: string): Promise<void> => {
	// Load all the event that are already on the calendar for today
	const serverEvents = await APIClient.get('/v1/calendar-events.list', {
		date: date.toISOString().substring(0, 10),
	});
	const externalEvents = serverEvents.data.filter(({ externalId }) => externalId);

	const appointments = await getOutlookEvents(date, server, token);
	const appointmentsFound = appointments.map((appointment) => appointment.Id.UniqueId);

	for await (const appointment of appointments) {
		try {
			const existingEvent = externalEvents.find(({ externalId }) => externalId === appointment.Id.UniqueId);

			const externalId = appointment.Id.UniqueId;
			const subject = appointment.Subject;
			const startTime = appointment.Start.ToISOString();
			const description = appointment.Body?.Text;

			// If the appointment is not in the rocket.chat calendar, add it.
			if (!existingEvent) {
				await APIClient.post('/v1/calendar-events.create', {
					externalId,
					subject,
					startTime,
					description,
				});
				continue;
			}

			// If nothing on the event has changed, do nothing.
			if (existingEvent.subject === subject && existingEvent.startTime === startTime && existingEvent.description === description) {
				continue;
			}

			// Update the server with the current data from outlook
			await APIClient.post('/v1/calendar-events.update', {
				eventId: existingEvent._id,
				startTime,
				subject,
				description,
			});
		} catch (e) {
			console.error(e);
		}
	}

	for await (const event of externalEvents) {
		if (!event.externalId || appointmentsFound.includes(event.externalId)) {
			continue;
		}

		try {
			await APIClient.post('/v1/calendar-events.delete', { eventId: event._id });
		} catch (e) {
			console.error(e);
		}
	}
};
