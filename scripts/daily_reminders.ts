
import { createClient } from '@supabase/supabase-js';

// This script is intended to be run as a scheduled task (cron job) on a server or Supabase Edge Function.
// It checks for projects with upcoming deadlines and marketing tasks for today, then sends an email.

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(to: string[], subject: string, html: string) {
    // Implementation depends on your email provider (Resend, SendGrid, etc.)
    // Example with Resend:
    /*
    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: to,
            subject: subject,
            html: html
        })
    });
    */
    console.log(`Sending email to ${to.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
}

async function checkProjectsAndNotify() {
    const today = new Date();
    const twelveDaysFromNow = new Date();
    twelveDaysFromNow.setDate(today.getDate() + 12);

    // Fetch projects with due_date between today and 12 days from now
    // Note: This assumes due_date is stored as YYYY-MM-DD string or timestamp
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', twelveDaysFromNow.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    if (projects && projects.length > 0) {
        const projectListHtml = projects.map(p => `
            <li>
                <strong>${p.name}</strong> - Deadline: ${p.due_date} (Urgency: ${p.urgency})
            </li>
        `).join('');

        const emailHtml = `
            <h2>Upcoming Project Deadlines</h2>
            <ul>${projectListHtml}</ul>
        `;

        await sendEmail(['admin@example.com'], 'Daily Project Reminders', emailHtml);
    }
}

async function checkTasksAndNotify() {
    const today = new Date().toISOString().split('T')[0];

    const { data: tasks, error } = await supabase
        .from('marketing_tasks')
        .select('*')
        .eq('execution_date', today);

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    if (tasks && tasks.length > 0) {
        const taskListHtml = tasks.map(t => `
            <li>
                <strong>${t.task_name}</strong> - ${t.details} (Status: ${t.status})
            </li>
        `).join('');

        const emailHtml = `
            <h2>Marketing Tasks for Today (${today})</h2>
            <ul>${taskListHtml}</ul>
        `;

        await sendEmail(['marketing@example.com'], 'Daily Marketing Tasks', emailHtml);
    }
}

async function main() {
    console.log('Running daily checks...');
    await checkProjectsAndNotify();
    await checkTasksAndNotify();
    console.log('Done.');
}

main();
