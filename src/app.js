const express = require("express")
const path = require("path");
require("dotenv").config();
const db = require(`./models/db`);
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"../public")));
app.get("/",(req,res) => {
    res.sendFile(path.join(__dirname,"../views/index.html"));
})
app.listen(PORT,() => {
    console.log(`Servidor HeavyLux corriendo en http://localhost:${PORT}`);
});
app.get(`/catalogo`, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/catalogo.html`));
});
app.get(`/cotizar`, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/cotizar.html`));
});
app.get(`/contacto`, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/contacto.html`));
});
app.post(`/cotizar`, (req, res) => {
    const { nombre, telefono, correo, productos_interes, observaciones} = req.body;

    const sql = `INSERT INTO cotizaciones (nombre, telefono, correo, productos_interes, observaciones) VALUES(?,?,?,?,?)`;
    db.query(sql, [nombre, telefono, correo, productos_interes, observaciones], (err, result) => {
        if (err) {
            console.error(`Error guardado cotización:`, err);
            res.send(`Error al enviar la cotización`);
            return;
        }
        res.send(`Cotización enviada exitosamente`);
    });
});
app.get(`/admin`, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/admin.html`));
});
app.get(`/admin/cotizaciones`, (req, res) => {
    const sql = `SELECT * FROM cotizaciones ORDER BY id DESC`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(`Error obteniendo cotizaciones:`, err);
            res.status(500).send({ error: `Error al obtener las cotizaciones` });
            return;
        }
        res.json(results);
    });
});
app.get(`/api/productos`, (req, res) => {
    const sql = `SELECT * FROM productos`;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(`Error obteniendo productos:`, err);
            res.status(500).send({ error: `Error al obtener los productos` });
            return;
        }
        res.json(results);
    });
});
app.post('/api/productos', (req, res) => {
    const { nombre, descripcion, precio, stock, categoria, imagen } = req.body;
    const sql = `INSERT INTO productos (nombre, descripcion, precio, stock, categoria, imagen) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombre, descripcion, precio, stock, categoria, imagen], (err, result) => {
        if (err) {
            console.error('Error agregando producto:', err);
            res.status(500).json({ error: 'Error al agregar producto' });
            return;
        }
        res.json({ mensaje: 'Producto agregado exitosamente', id: result.insertId });
    });
});