const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Voting OTP',
    html: `
      <div style="font-family: Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background:#2563eb; padding:20px; color:white;">
            <h2 style="margin:0;">🛡 SecureVote</h2>
            <p style="margin:5px 0 0; font-size:12px;">Blockchain Voting System</p>
          </div>

          <!-- Body -->
          <div style="padding:30px;">
            <h3 style="color:#111;">OTP Verification</h3>
            <p style="color:#555;">
              Use the OTP below to securely login to the voting system:
            </p>

            <!-- OTP Box -->
            <div style="
              margin:20px 0;
              padding:15px;
              background:#f1f5f9;
              border-radius:8px;
              text-align:center;
            ">
              <p style="margin:0; font-size:14px; color:#666;">Your OTP</p>
              <p style="
                margin:8px 0 0;
                font-size:26px;
                font-weight:bold;
                letter-spacing:6px;
                color:#2563eb;
              ">
                ${otp}
              </p>
            </div>

            <p style="color:#555; font-size:14px;">
              This OTP is valid for <b>10 minutes</b>.
            </p>

            <p style="color:#ef4444; font-size:13px;">
              ⚠️ Do not share this OTP with anyone.
            </p>

            <br/>
            <p style="color:#333;">Regards,<br/><b>Election Team</b></p>
          </div>

          <!-- Footer -->
          <div style="padding:15px; text-align:center; font-size:12px; color:#999;">
            © ${new Date().getFullYear()} SecureVote
          </div>

        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendVoterLoginMail = async (email, name, loginId) => {
  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: 'Your Voter Login Details',
    html: `
      <div style="font-family: Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background:#2563eb; padding:20px; color:white;">
            <h2 style="margin:0;">🛡 SecureVote</h2>
            <p style="margin:5px 0 0; font-size:12px;">Blockchain Voting System</p>
          </div>

          <!-- Body -->
          <div style="padding:30px;">
            <h3 style="color:#111;">Hello ${name},</h3>
            <p style="color:#555;">
              Your voter account has been successfully created.
            </p>

            <!-- Login Box -->
            <div style="
              margin:20px 0;
              padding:15px;
              background:#f1f5f9;
              border-radius:8px;
              text-align:center;
            ">
              <p style="margin:0; font-size:14px; color:#666;">Your Login ID</p>
              <p style="margin:5px 0 0; font-size:20px; font-weight:bold; color:#2563eb;">
                ${loginId}
              </p>
            </div>

            <p style="color:#555;">
              Please keep this ID safe. You will need it during the election.
            </p>

            <br/>
            <p style="color:#333;">Regards,<br/><b>Election Team</b></p>
          </div>

          <!-- Footer -->
          <div style="padding:15px; text-align:center; font-size:12px; color:#999;">
            © ${new Date().getFullYear()} SecureVote
          </div>

        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOTPForPasswordReset = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background:#dc2626; padding:20px; color:white;">
            <div style="font-size:24px; font-weight:bold;">🔐 SecureVote</div>
            <p style="margin:5px 0 0; font-size:12px; opacity:0.9;">Password Recovery</p>
          </div>

          <!-- Body -->
          <div style="padding:30px; text-align:center;">
            <h2 style="margin-bottom:10px; color:#111;">Reset Your Password</h2>
            <p style="color:#555;">
              We received a request to reset your password. Use the OTP below to proceed:
            </p>

            <!-- OTP Box -->
            <div style="
              margin:20px auto;
              padding:15px;
              font-size:28px;
              font-weight:bold;
              letter-spacing:8px;
              background:#fef2f2;
              border-radius:8px;
              display:inline-block;
              color:#dc2626;
            ">
              ${otp}
            </div>

            <p style="color:#777; font-size:14px;">
              This OTP is valid for <b>10 minutes</b>.
            </p>

            <p style="color:#ef4444; font-size:13px;">
              If you did not request a password reset, please ignore this email or contact support immediately.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:15px; text-align:center; font-size:12px; color:#999;">
            © ${new Date().getFullYear()} SecureVote. All rights reserved.
          </div>

        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};