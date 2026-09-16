import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Format subject SENGAJA dibuat pola tetap & terstruktur, supaya nanti bisa
// dijadikan trigger otomasi (n8n/Hermes dsb) yang "mendengarkan" email masuk
// dengan pola ini, tanpa gantung ke format email notifikasi bank yang berubah-ubah.
export async function sendOrderNotificationEmail(params: {
  orderCode: string;
  productTitle: string;
  amountIdr: number;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
}) {
  if (!resend || !process.env.NOTIFY_EMAIL) {
    console.warn("Resend belum dikonfigurasi, notifikasi email dilewati.");
    return;
  }

  const subject = `Pesanan Baru #${params.orderCode}`;

  try {
    const { error: resendError } = await resend.emails.send({
      // Domain default Resend, cukup buat kirim ke email sendiri (bukan ke pembeli)
      from: "Toko Notif <onboarding@resend.dev>",
      to: process.env.NOTIFY_EMAIL,
      subject,
      html: `
        <p><b>Ada pesanan baru masuk.</b></p>
        <table>
          <tr><td>Kode Pesanan</td><td>${params.orderCode}</td></tr>
          <tr><td>Produk</td><td>${params.productTitle}</td></tr>
          <tr><td>Jumlah</td><td>Rp ${params.amountIdr.toLocaleString("id-ID")}</td></tr>
          <tr><td>Pembeli</td><td>${params.buyerName || "-"}</td></tr>
          <tr><td>Email Pembeli</td><td>${params.buyerEmail}</td></tr>
          <tr><td>WhatsApp Pembeli</td><td>${params.buyerWhatsapp || "-"}</td></tr>
        </table>
        <p>Cek & verifikasi bukti transfer di dashboard &gt; Pesanan.</p>
      `,
    });

    // Resend SDK TIDAK throw error - error dari API balik lewat field ini,
    // jadi harus dicek manual atau bakal kelewat diam-diam.
    if (resendError) {
      console.error("Resend API error:", resendError);
    }
  } catch (err) {
    console.error("Gagal kirim email notifikasi:", err);
  }
}

// Mengirimkan email konfirmasi pembayaran dan tautan download langsung ke pembeli.
export async function sendBuyerDownloadEmail(params: {
  orderCode: string;
  productTitle: string;
  amountIdr: number;
  buyerName: string;
  buyerEmail: string;
  downloadUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("RESEND_API_KEY belum diatur, pengiriman email ke pembeli dilewati.");
    return { success: false, error: "RESEND_API_KEY missing" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "Toko Kang Jaund <onboarding@resend.dev>";
  const subject = `Pesanan Dikonfirmasi: Download ${params.productTitle} (#${params.orderCode})`;

  try {
    const { error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: params.buyerEmail,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2621; line-height: 1.6;">
          <h2 style="color: #4e6552; margin-top: 0;">Halo, ${params.buyerName || "Kak"}! 👋</h2>
          <p>Terima kasih sudah berbelanja di <b>Toko Kang Jaund</b>. Pembayaran kamu untuk pesanan <b>#${params.orderCode}</b> telah kami terima dan verifikasi.</p>
          
          <div style="background-color: #f8f6f0; border-radius: 16px; border: 1px solid #e5e8e1; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #6e7970; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Ringkasan Pesanan</p>
            <p style="margin: 4px 0; font-size: 16px; font-weight: bold; color: #1f2621;">${params.productTitle}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #6e7970;">Total: Rp ${params.amountIdr.toLocaleString("id-ID")}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #9aa39c;">Link download ini aktif selama 7 hari.</p>
            
            <div style="margin-top: 20px; text-align: center;">
              <a href="${params.downloadUrl}" style="background-color: #4e6552; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                Download File Sekarang &rarr;
              </a>
            </div>
          </div>

          <p style="font-size: 13px; color: #6e7970;">
            Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di browser kamu:<br />
            <a href="${params.downloadUrl}" style="color: #4e6552; word-break: break-all;">${params.downloadUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e5e8e1; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6e7970; text-align: center;">
            Ada kendala atau pertanyaan? Hubungi kami langsung via WhatsApp atau balas email ini.<br />
            &copy; ${new Date().getFullYear()} Toko Kang Jaund.
          </p>
        </div>
      `,
    });

    if (resendError) {
      console.error("Resend API error saat kirim ke pembeli:", resendError);
      return { success: false, error: resendError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gagal mengirim email download ke pembeli:", message);
    return { success: false, error: message };
  }
}
