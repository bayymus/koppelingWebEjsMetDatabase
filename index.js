import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from 'body-parser';
import pg from "pg";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "world",
    password: "12345678",
    port: 5432,
});

db.connect();

const app = express();
const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));

// app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
// ==>> VOOR DEBUGGING VERPLICHT!!!

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

    // hier komt DB insert
});


app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});