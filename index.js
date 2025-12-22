import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from 'body-parser';
import pg from "pg";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "world",
    password: "12345678",
    port: 5432,
});

db.connect();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// transporter.verify(function (error, success) {
//     if (error) {
//         console.log(error);
//     } else {
//         console.log("Server is ready to take messages");
//     }
// });

const app = express();
const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));

// app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");// ==>> VOOR DEBUGGING VERPLICHT!!!

app.use(bodyParser.urlencoded({ extended: true }));


// helper functie (bovenaan je bestand, buiten app.get)
function formatDatum(d) {
    if (!d) return "-";
    const dateObj = new Date(d);
    const dag = String(dateObj.getDate()).padStart(2, '0');
    const maand = String(dateObj.getMonth() + 1).padStart(2, '0');
    const jaar = dateObj.getFullYear();
    return `${dag} / ${maand} / ${jaar}`;
}

app.get("/", async (req, res) => {
    try {
        // data ophalen
        const result = await db.query("SELECT * FROM fiets");
        const fietsen = result.rows;

        // datums formatteren
        for (let i = 0; i < fietsen.length; i++) {
            fietsen[i].datumgekeurd = formatDatum(fietsen[i].datumgekeurd);
            console.log(`${fietsen[i].datumgekeurd}`);
            fietsen[i].keuringvervaldatum = formatDatum(fietsen[i].keuringvervaldatum);
            console.log(`${fietsen[i].keuringvervaldatum}`);
        }
        // doorgeven aan EJS
        res.render("index.ejs", { fietsen });
        console.log(fietsen);

    } catch (err) {
        console.error("database niet bereikbaar:", err.message);
        res.status(500).send("Database fout");
    }
});

app.get("/Wijzig", async (req, res) => {
    const result = await db.query("SELECT * FROM fiets");
    const fietsen = result.rows;
    res.render("Wijzig.ejs", { fietsen: [] })
});


app.post("/Wijzig", async (req, res) => {
    const { zoektype, zoekwaarde } = req.body;

    // basisvalidatie
    if (!zoektype || !zoekwaarde) {
        return res.status(400).send("Onvolledige invoer");
    }

    try {
        //     let rows =[];

        //     if (zoektype === "fietsId") {
        //         // zoeken op fiets ID
        //         [rows] = await db.query(
        //             "SELECT * FROM fiets WHERE fietsid = $1",
        //             [zoekwaarde]
        //         );

        //     } else if (zoektype === "gebruiker") {
        //         // zoeken op gebruikersnaam
        //         const [rows] = await db.query(
        //             "SELECT * FROM fiets WHERE gebruiker = $1",
        //             [zoekwaarde]
        //         );
        //     }
        //     res.render("Wijzig.ejs", { fietsen: rows });
        //     console.log({ fietsen: rows });

        // } catch (err) {
        //     console.error(err);
        //     res.status(500).send("Database fout");
        // }

        let query = "";
        let values = [zoekwaarde];

        if (zoektype === "fietsId") {
            query = "SELECT * FROM fiets WHERE fietsid = $1";
        } else if (zoektype === "gebruiker") {
            query = "SELECT * FROM fiets WHERE gebruiker = $1";
        }

        const result = await db.query(query, values);

        if (result.rows.length > 0) {
            // Er zijn matchende rijen
            res.render("Wijzig.ejs", { fietsen: result.rows });
        } else {
            // Geen match gevonden
            res.render("Wijzig.ejs", {
                fietsen: []
            });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Database fout");
    }

});


app.post("/", async (req, res) => {
    const { fietsID, naam, gebruiker, datumGekeurd, keuringVervalDatum } = req.body;
    try {
        await db.query(
            "INSERT INTO fiets (fietsid, naam, gebruiker, datumgekeurd, keuringvervaldatum) VALUES ($1, $2, $3, $4, $5)",
            [fietsID, naam, gebruiker, datumGekeurd, keuringVervalDatum]
        );

        res.redirect("/");
    } catch (err) {
        console.error(err);
        // res.status(500).send("Database fout");
        res.send(`
        <h1 style="color: red;">Database insert fout, melding: << ${err.message} >> </h1>
        <a href="/">Terug</a>;
                `);
    }
    console.log(req.body); // debug
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.SMTP_USER,
        subject: "dit is een test met nodemailer",
        text: "fietsen opstellen voor keuring"
    };


    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email verzonden:", info.response);
    } catch (error) {
        console.error(error);
        res.status(500).send("Kon de email niet verzenden.");
    }



});


app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});