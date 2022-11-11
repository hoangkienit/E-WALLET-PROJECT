const nodemailer = require("nodemailer");

exports.sendMail = (email, subject, htmlContent) => {
    const transporter = nodemailer.createTransport({
        host: process.env.APP_HOST,
        port: process.env.APP_PORT,
        secure:false,
        service: "gmail",
        auth: {
          user: process.env.ACCOUNT_EMAIL,
          pass: process.env.ACCOUNT_PASSWORD,
        },
      });

    const options = {
        from: '<'+process.env.ACCOUNT_EMAIL+'>',
        to: email,
        subject: subject,
        html: htmlContent,
      }
      console.log('Sent email successfully to ' + email)
      return transporter.sendMail(options);
}