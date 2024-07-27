import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process"; // watch out
import { stderr, stdout } from "process";

const app = express();

// multer middleware --

const storage = multer.diskStorage({
  destination: function (req, file, cb) { // cb is callback function
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
  }
});

// multer configuration - 
// multer object jo multer se aaya hai
const upload = multer({ storage: storage }); // capable of reading a file

// using cors while there is method we pass object in that 
/* by default they always stop we have to give allow to them  */

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true
  })
);
/* kaun se type ke content app le rhe hoo allow only specific origin  */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // watch it
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

/* Middleware */

/* 1. express - allow taki hum data de sakhe json format 
   2. express.urlencoded - to get the url se data   
   3. for location - for this uploads to stream the file and also to serve the file! 
   */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get('/', function (req, res) {
  res.json({ message: "Hello chai aur code" });
});

// continuing writing routes - for handling files ...
app.post("/upload", upload.single('file'), function (req, res) {
  const lessonId = uuidv4();
  const videoPath = req.file.path;
  const outputPath = `./uploads/courses/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.log("hlsPath", hlsPath);

  // if there are no directories or folders - 
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // ffmpeg
  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  // no queue because of POC, not to be used in production 
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`);
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    const videoUrl = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`;

    res.json({
      message: "Video converted to HLS format",
      videoUrl: videoUrl,
      lessonId: lessonId
    });
  });
});

app.listen(8000, function () {
  console.log("App is listening at port 8000...");
});
