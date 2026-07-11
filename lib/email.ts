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
