import express from "express"
import path from "node:path"

const app = express();
const port = process.env.PORT || 3001;

import routes from "./routes.js"

app.use('/uploads', express.static(path.resolve('uploads')))

app.use(express.json());

app.use(routes);

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
