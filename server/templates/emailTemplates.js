export const welcomeEmailTemplate = (name) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Arihant Dream Infra Projects Limited, ${name}!</h2>
            <p>We are excited to have you on board.</p>
            <p>Your account has been successfully created.</p>
            <br>
            <p>Best regards,</p>
            <p>The Arihant Dream Infra Projects Limited Team</p>
        </div>
    `;
};

export const taskAssignedTemplate = (taskTitle, assignedBy) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Task Assigned</h2>
            <p>A new task <strong>${taskTitle}</strong> has been assigned to you by ${assignedBy}.</p>
            <p>Please log in to your dashboard to view the details.</p>
            <br>
            <p>Best regards,</p>
            <p>The Arihant Dream Infra Projects Limited Team</p>
        </div>
    `;
};
