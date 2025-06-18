import io from "socket.io-client";

const messageId = "1234567890";
const eventType = "ADDRESS_ACTIVITY";
const url = "wss://web3.nodit.io/v1/websocket";

const params = {
  description: "test",
  isInstant: true,
  condition: {
    addresses: ["0x646183948c666C89A9815c2Df44C370ed41A657B"], // 지갑 연동 후 얻은 주소
  },
};

const options = {
  rejectUnauthorized: false,
  transports: ["websocket", "polling"],
  path: "/v1/websocket/",
  auth: {
    apiKey: "oN5gz-nitdyu-HnRV285RU7cVKE0XKEn", // nodit api key
  },
  query: { // 지갑 연동 후 얻은 chain 정보
    protocol: "ethereum",
    network: "sepolia",
  },
};

function connectToServer() {
  return new Promise((resolve, reject) => {
    const socket = io(url, options);

    socket.on("connect", () => {
      socket.on("subscription_registered", (message) => {
        console.log("registered", message);
      });

      socket.on("subscription_connected", (message) => {
        console.log("subscription_connected", message);

        socket.emit("subscription", messageId, eventType, JSON.stringify(params));
      });

      socket.on("subscription_error", (message) => {
        console.error(`nova_subscription_error: ${message}`);
      });

      socket.on("subscription_event", (message) => {
        console.log("subscription Event : ", message);
      });

      socket.on("disconnect", (message) => {
        console.warn(`disconnect`, message);
      });

      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error(`Socket connection error to : `, error);
      reject(error);
    });
  });
}

connectToServer();
