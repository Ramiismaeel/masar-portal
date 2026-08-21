export function verificationEmail({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  return {
    subject: "Verify your email — Masar Portal",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; color: #171717;">
        <h2 style="color: #0d4d35;">Welcome to Masar Portal</h2>

        <p>Hello ${name},</p>

        <p>Please confirm your email address to continue with your application.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" bgcolor="#0d4d35" style="border-radius: 8px;">
      <a href="${url}"
         style="display: inline-block; padding: 14px 24px; font-family: system-ui, sans-serif;
                font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;
                border-radius: 8px;">
        Verify my email
      </a>
    </td>
  </tr>
</table>

        <p style="font-size: 14px; color: #555;">
          If the button does not work, copy this link into your browser:
        </p>
        <p style="font-size: 13px; word-break: break-all; color: #555;">${url}</p>

        <p style="font-size: 14px; color: #555;">
          This link expires in 7 days. If you did not create an account, ignore this email.
        </p>




<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />




        <div data-spark-custom-html="true">
    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial">
        <tbody>
            <tr>
                <td>
                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial">
                        <tbody>
                            <tr>
                                <td style="vertical-align: top">
                                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial">
                                        <tbody>
                                            <tr>
                                                <td height="24" aria-label="Horizontal Spacer"></td>
                                            </tr>
                                            <tr>
                                                <td style="text-align: center">
                                                    <img src="https://masar-center.de/masar-logo.png" role="presentation" style="max-width: 130px; display: block" width="130">
                                                </td>
                                            </tr>
                                            <tr>
                                                <td height="24" aria-label="Horizontal Spacer"></td>
                                            </tr>
                                            <tr>
                                                <td style="text-align: center">
                                                    <div>
                                                        <a href="https://x.com/Masar1661048" style="
                                display: inline-block;
                                padding: 0px;
                                background-color: rgb(0, 0, 0);
                                border-radius: 50%;
                              "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/x-icon-dark-2x.png" alt="twitter" width="24" style="
                                  background-color: rgb(0, 0, 0);
                                  max-width: 135px;
                                  display: block;
                                  border-radius: inherit;
                                " loading="lazy"></a><span style="display: inline-block; width: 5px"></span><a href="https://www.facebook.com/profile.php?id=61585719966946" style="
                                display: inline-block;
                                padding: 0px;
                                background-color: rgb(0, 0, 0);
                                border-radius: 50%;
                              "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/facebook-icon-dark-2x.png" alt="facebook" width="24" style="
                                  background-color: rgb(0, 0, 0);
                                  max-width: 135px;
                                  display: block;
                                  border-radius: inherit;
                                " loading="lazy"></a><span style="display: inline-block; width: 5px"></span><a href="https://www.instagram.com/masar.ug.de" style="
                                display: inline-block;
                                padding: 0px;
                                background-color: rgb(0, 0, 0);
                                border-radius: 50%;
                              "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/instagram-icon-dark-2x.png" alt="instagram" width="24" style="
                                  background-color: rgb(0, 0, 0);
                                  max-width: 135px;
                                  display: block;
                                  border-radius: inherit;
                                " loading="lazy"></a><span style="display: inline-block; width: 5px"></span><a href="https://api.whatsapp.com/send/?phone=491771873142&amp;text&amp;type=phone_number&amp;app_absent=0" style="
                                display: inline-block;
                                padding: 0px;
                                background-color: rgb(0, 0, 0);
                                border-radius: 50%;
                              "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/whatsapp-icon-dark-2x.png" alt="whatsapp" width="24" style="
                                  background-color: rgb(0, 0, 0);
                                  max-width: 135px;
                                  display: block;
                                  border-radius: inherit;
                                " loading="lazy"></a>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                                <td width="46" aria-label="Vertical Spacer">
                                    <div style="width: 46px"></div>
                                </td>
                                <td style="padding: 0px; vertical-align: middle">
                                    <h2 style="
                      margin: 0px;
                      font-size: 18px;
                      font-family: Arial;
                      color: rgb(0, 0, 0);
                      font-weight: 600;
                      line-height: 24px;
                    ">
                                        <span>Masar</span><span>&nbsp;</span><span>UG</span>
                                    </h2>
                                    <p style="
                      margin: 0px;
                      font-size: 14px;
                      font-family: Arial;
                      color: rgb(37, 36, 36);
                      font-weight: 500;
                    ">
                                        consulting services
                                    </p>
                                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial; width: 100%">
                                        <tbody>
                                            <tr>
                                                <td height="16" aria-label="Horizontal Spacer"></td>
                                            </tr>
                                            <tr>
                                                <td style="
                            width: 100%;
                            height: 1px;
                            border-bottom: 1px solid rgb(247, 99, 99);
                            border-left: medium;
                            display: block;
                          " width="auto" aria-label="Divider"></td>
                                            </tr>
                                            <tr>
                                                <td height="8" aria-label="Horizontal Spacer"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table cellpadding="0" cellspacing="0" border="0" style="
                      font-size: medium;
                      font-family: Arial;
                      line-height: 1;
                    ">
                                        <tbody>
                                            <tr style="vertical-align: middle; height: 28px">
                                                <td width="26" style="vertical-align: middle">
                                                    <table cellpadding="0" cellspacing="0" border="0" style="
                              font-size: medium;
                              font-family: Arial;
                              width: 26px;
                            ">
                                                        <tbody>
                                                            <tr>
                                                                <td style="vertical-align: bottom">
                                                                    <span style="
                                      display: inline-block;
                                      background-color: rgb(247, 99, 99);
                                    "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/phone-icon-dark-2x.png" alt="mobilePhone" width="18" style="
                                        display: block;
                                        background-image: linear-gradient(
                                          rgb(247, 99, 99),
                                          rgb(247, 99, 99)
                                        );
                                      "></span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                                <td style="padding: 0px; color: rgb(0, 0, 0)">
                                                    <a href="tel:+491771873142" style="
                              text-decoration: none;
                              color: rgb(0, 0, 0);
                              font-size: 14px;
                            "><span>+491771873142</span></a>
                                                </td>
                                            </tr>
                                            <tr style="vertical-align: middle; height: 28px">
                                                <td width="26" style="vertical-align: middle">
                                                    <table cellpadding="0" cellspacing="0" border="0" style="
                              font-size: medium;
                              font-family: Arial;
                              width: 26px;
                            ">
                                                        <tbody>
                                                            <tr>
                                                                <td style="vertical-align: bottom">
                                                                    <span style="
                                      display: inline-block;
                                      background-color: rgb(247, 99, 99);
                                    "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/email-icon-dark-2x.png" alt="emailAddress" width="18" style="
                                        display: block;
                                        background-image: linear-gradient(
                                          rgb(247, 99, 99),
                                          rgb(247, 99, 99)
                                        );
                                      "></span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                                <td style="padding: 0px; color: rgb(0, 0, 0)">
                                                    <a href="mailto:info@masar-center.de" style="
                              text-decoration: none;
                              color: rgb(0, 0, 0);
                              font-size: 14px;
                            "><span>info@masar-center.de</span></a>
                                                </td>
                                            </tr>
                                            <tr style="vertical-align: middle; height: 28px">
                                                <td width="26" style="vertical-align: middle">
                                                    <table cellpadding="0" cellspacing="0" border="0" style="
                              font-size: medium;
                              font-family: Arial;
                              width: 26px;
                            ">
                                                        <tbody>
                                                            <tr>
                                                                <td style="vertical-align: bottom">
                                                                    <span style="
                                      display: inline-block;
                                      background-color: rgb(247, 99, 99);
                                    "><img src="https://cdn2.hubspot.net/hubfs/53/tools/email-signature-generator/icons/link-icon-dark-2x.png" alt="website" width="18" style="
                                        display: block;
                                        background-image: linear-gradient(
                                          rgb(247, 99, 99),
                                          rgb(247, 99, 99)
                                        );
                                      "></span>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                                <td style="padding: 0px; color: rgb(0, 0, 0)">
                                                    <a href="https://masar-center.de" style="
                              text-decoration: none;
                              color: rgb(0, 0, 0);
                              font-size: 14px;
                            "><span>https://masar-center.de</span></a>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial">
                                        <tbody>
                                            <tr>
                                                <td height="24" aria-label="Horizontal Spacer"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: medium; font-family: Arial">
                                        <tbody>
                                            <tr>
                                                <td colspan="3" style="
                            max-width: 300px;
                            font-size: 12px;
                            padding-top: 1rem;
                          ">
                                                    <div class="legal-content">
                                                        <p style="font-size: inherit; margin: 0px"></p>
                                                        <p style="font-size: inherit; margin: 0px"></p>
                                                        <p style="font-size: inherit; margin: 0px"></p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
</div>
      </div>
    `,
  };
}
