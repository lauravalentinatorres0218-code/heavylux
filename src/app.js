const express = require("express")
const path = require("path");
const db = require(`./models/db`);
require("dotenv").config();
db.query(`CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2),
    stock INT,
    categoria VARCHAR(100),
    imagen VARCHAR(255)
)`, (err) => { if (err) console.error(err); });

db.query(`CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    empresa VARCHAR(255),
    telefono VARCHAR(20),
    correo VARCHAR(255),
    productos_interes TEXT,
    observaciones TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => { if (err) console.error(err); });

db.query(`INSERT IGNORE INTO productos (id, nombre, descripcion, precio, stock, categoria, imagen) VALUES
(1, 'Barra LED 48" Pro Series', 'Barra LED de alta potencia para vehículos de carga pesada', 890000, 10, 'Iluminación LED', 'producto1.jpg'),
(2, 'Filtro de aceite Kenworth', 'Filtro de aceite original para tractocamiones Kenworth', 95000, 25, 'Repuestos', 'producto2.jpg'),
(3, 'Cromado espejo lateral', 'Espejo lateral cromado para volquetas y tractomulas', 220000, 15, 'Lujos y accesorios', 'producto3.jpg'),
(4, 'Amortiguador trasero volqueta', 'Amortiguador trasero reforzado para volquetas', 350000, 8, 'Suspensión', 'producto4.jpg')
`, (err) => { if (err) console.error(err); });

const app = express();
const session = require('express-session');

function verificarSesion(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.use(session({
    secret: 'heavylux-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,"../public")));
app.get("/",(req,res) => {
    res.sendFile(path.join(__dirname,"../views/index.html"));
})
app.listen(PORT, '0.0.0.0',() => {
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
app.get(`/admin`, verificarSesion, (req, res) => {
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
const bcrypt = require('bcrypt');
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});
app.post('/login', (req, res) => {
    const { correo, password } = req.body;
    const sql = 'SELECT * FROM usuarios WHERE correo = ?';
    db.query(sql, [correo], async (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/login?error=1');
        }
        const usuario = results[0];
        const match = await bcrypt.compare(password, usuario.password);
        if (match) {
            req.session.usuario = usuario;
            res.redirect('/admin');
        } else {
            res.redirect('/login?error=1');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
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