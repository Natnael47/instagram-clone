import { io } from "socket.io-client";

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMWJjYjk5YmM0ZGRkOGIxYmNjODg0OSIsImlhdCI6MTc4MDIxOTIyNiwiZXhwIjoxNzgwODI0MDI2fQ.BNHykbfgyNNANSmI1WeGlvKcZTSwpsFnVtMmr9Az6kc";

const socket = io("http://localhost:5000", {
  auth: { token },
  transports: ["polling"],
});

socket.on("connect", () => {
  console.log("Connected! ID:", socket.id);
});

socket.on("new-post", (data: any) => {
  console.log("New post received:", data);
});

socket.on("new-notification", (data: any) => {
  console.log("New notification:", data);
});

socket.on("connect_error", (err: Error) => {
  console.log("Connection error:", err.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});
