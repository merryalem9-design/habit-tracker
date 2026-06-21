import "dotenv/config";
import express from "express";
import { PrismaClient } from "../generated/prisma/client" ;
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});
const prisma = new PrismaClient({adapter});


const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/",( req , res ) => {
  res.send("Habit Tracker API is running")
});
function generateAlias(): string {
const adjectives=["Quiet", "Brave","Calm","Swift","Bold","Gentle"];
const animals = ["Falcon", "Tiger", "Otter", "Wolf", "Eagle", "Fox"];
  
const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
const animal = animals[Math.floor(Math.random() *animals.length )];
const number = Math.floor(Math.random() * 1000);

return `${adjective} ${animal}${number}`;
}
app.post("/signup", async (req, res) => {
  try{
    const { email, password } = req.body;

    if(!email || !password){
      return res.status(400).json({ error: "Email and password are required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayAlias: generateAlias(),
        avatarSeed: Math.random().toString(36).substring(2, 10),
        timezone: "Africa/Addis_Ababa",
      },
    });
    res.json({
      message: "User created successfully",
      userId: user.id,
      displayAlias: user.displayAlias, 
    });
  }catch(err) {
    console.error(err);
    res.status(500).json({error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
});
