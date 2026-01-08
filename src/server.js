const express = require("express");
const axios = require("axios");
const https = require("https"); // Thêm cái này để hỗ trợ HTTPS agent

// --- ĐOẠN ĐÁNH DẤU CỦA BẠN ---
console.log("\n\n###################################################");
console.log("🛑 CHECK FILE: Đây là file server.js tui mới sửa lúc " + new Date().toLocaleTimeString());
console.log("###################################################\n\n");
// ---------------------

let cache = {};

function generateKey(req) {
  return req.method + ":" + req.originalUrl;
}

function clearCache() {
  cache = {};
}

function startServer(port, origin) {
  const app = express();
  
  // Tắt kiểm tra SSL (quan trọng khi gọi https từ localhost)
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  app.use(async (req, res) => {
    const key = generateKey(req);

    // 1. Kiểm tra Cache
    if (cache[key]) {
      console.log("✅ CACHE HIT:", key);
      return res
        .status(cache[key].status)
        .set(cache[key].headers)
        .set("X-Cache", "HIT")
        .send(cache[key].data);
    }

    try {
      console.log("🚀 CACHE MISS - Đang gọi tới:", origin + req.originalUrl);

      // --- SỬA LỖI HEADER (QUAN TRỌNG) ---
      // Phải xóa 'accept-encoding' để tránh lỗi nén Gzip/Brotli
      const headers = { ...req.headers };
      delete headers.host; 
      delete headers['accept-encoding']; 
      delete headers['if-none-match'];

      const response = await axios({
        method: req.method,
        url: origin + req.originalUrl,
        headers: headers,
        httpsAgent: httpsAgent, // Dùng agent fix lỗi SSL
        validateStatus: () => true, // Chấp nhận mọi status code (kể cả 404/500 từ origin)
      });

      cache[key] = {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };

      res
        .status(response.status)
        .set(response.headers)
        .set("X-Cache", "MISS")
        .send(response.data);

    } catch (err) {
      // --- LOG LỖI CHI TIẾT ---
      console.error("❌ LỖI XẢY RA TRONG CATCH:");
      console.error(err.message);

      if (err.response) {
        console.log("🔥 Server gốc chửi:", err.response.status); 
        res.status(err.response.status).send(err.response.data);
      } else if (err.request) {
        console.log("🔌 Không kết nối được tới server gốc!");
        res.status(502).send({ error: "Bad Gateway - Cannot reach origin", details: err.message });
      } else {
        console.log("💀 Lỗi setup:", err.message);
        res.status(500).send({ error: "Internal Proxy Error", details: err.message });
      }
    }
  });

  app.listen(port, () => {
    console.log(`Caching proxy running on port ${port}`);
    console.log(`Forwarding requests to: ${origin}`);
  });
}

module.exports = { startServer, clearCache };