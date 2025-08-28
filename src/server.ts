import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import usersRoutes from "./routes/users.js";
import ridesRoutes from "./routes/rides.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/users", usersRoutes);
app.use("/rides", ridesRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
