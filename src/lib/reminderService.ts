import emailjs from '@emailjs/browser';
import { supabase } from './supabase';

// Replace these with your actual EmailJS credentials
// Ideally, these should be in .env, but for now we can put them here or ask user to fill them
const EMAILJS_SERVICE_ID = 'service_sju168t';
const EMAILJS_TEMPLATE_ID = 'template_8ie8ebj';
const EMAILJS_PUBLIC_KEY = 'QW7aRogx0iHmqzrw_';

export const checkAndSendReminders = async (force: boolean = false) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Check if email was already sent today (unless forced)
        if (!force) {
            const { data: logs, error: logError } = await supabase
                .from('system_logs')
                .select('*')
                .eq('event_type', 'daily_email_reminder')
                .eq('event_date', today);

            if (logError) throw logError;

            if (logs && logs.length > 0) {
                console.log('Daily reminder already sent for today.');
                return;
            }
        }

        // 2. Fetch Projects with upcoming deadlines (next 12 days)
        const twelveDaysFromNow = new Date();
        twelveDaysFromNow.setDate(new Date().getDate() + 12);

        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('*')
            .gte('due_date', today)
            .lte('due_date', twelveDaysFromNow.toISOString().split('T')[0])
            .order('due_date', { ascending: true });

        if (projectsError) throw projectsError;

        // 3. Fetch Marketing Tasks for today
        const { data: tasks, error: tasksError } = await supabase
            .from('marketing_tasks')
            .select('*')
            .eq('execution_date', today);

        if (tasksError) throw tasksError;

        // 4. Prepare Email Content
        if ((projects && projects.length > 0) || (tasks && tasks.length > 0)) {
            const projectList = projects?.map(p =>
                `<li><strong>${p.name}</strong> - תאריך יעד: ${p.due_date} (דחיפות: ${p.urgency})</li>`
            ).join('') || '<li>אין פרויקטים עם תאריך יעד קרוב.</li>';

            const taskList = tasks?.map(t =>
                `<li><strong>${t.task_name}</strong> - ${t.details} (סטטוס: ${t.status})</li>`
            ).join('') || '<li>אין משימות שיווק להיום.</li>';

            const templateParams = {
                to_name: 'צוות יקר',
                to_email: 'lior31197@gmail.com', // Ensure this is updated by user
                date: today,
                project_list: `<ul>${projectList}</ul>`,
                task_list: `<ul>${taskList}</ul>`
            };

            // 5. Send Email via EmailJS
            // Note: This requires the user to have installed @emailjs/browser
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                templateParams,
                EMAILJS_PUBLIC_KEY
            );

            if (force) alert('המייל נשלח בהצלחה! 📧');

            // 6. Log the event to prevent duplicate sending
            await supabase
                .from('system_logs')
                .insert({
                    event_type: 'daily_email_reminder',
                    event_date: today,
                    details: 'Email sent successfully via EmailJS'
                });
        } else {
            console.log('No projects due soon or tasks for today. No email needed.');
            if (force) alert('אין פרויקטים דחופים או משימות להיום, ולכן לא נשלח מייל.');
        }

    } catch (error: any) {
        console.error('Error in reminder service:', error);
        alert('שגיאה בשליחת המייל: ' + (error.text || error.message || error));
    }
};
