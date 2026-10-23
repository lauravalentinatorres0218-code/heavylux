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

const app = express();
const session = require('express-session');

function verificarSesion(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login');
    }
}
function soloAdmin(req, res, next) {
    if (req.session.usuario && req.session.usuario.rol === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
}
app.use(session({
    secret: process.env.SESSION_SECRET || 'heavylux-secret-2026',    
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
app.get(`/nosotros`, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/nosotros.html`));
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
        res.redirect('/cotizar?enviado=1');
    });
});
app.get(`/admin`, soloAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, `../views/admin.html`));
});
app.get(`/admin/cotizaciones`, soloAdmin, (req, res) => {
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
    db.query('SELECT * FROM usuarios WHERE correo = ?', [correo], async (err, results) => {
        if (!err && results.length > 0) {
            const u = results[0];
            if (await bcrypt.compare(password, u.password)) {
                req.session.usuario = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol };
                return res.redirect('/admin');
            }
            return res.redirect('/login?error=1');
        }
        db.query('SELECT * FROM clientes WHERE correo = ?', [correo], async (err2, rc) => {
            if (err2 || rc.length === 0) return res.redirect('/login?error=1');
            const c = rc[0];
            if (await bcrypt.compare(password, c.password)) {
                req.session.usuario = { id: c.id, nombre: c.nombre, correo: c.correo, rol: 'cliente' };
                return res.redirect('/carrito');
            }
            res.redirect('/login?error=1');
        });
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
app.post('/api/productos', soloAdmin, (req, res) => {    
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
app.delete('/api/productos/:id', soloAdmin, (req, res) => {    
    const { id } = req.params;
    const sql = `DELETE FROM productos WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error eliminando producto:', err);
            res.status(500).json({ error: 'Error al eliminar producto' });
            return;
        }
        res.json({ mensaje: 'Producto eliminado exitosamente' });
    });
});
app.get('/producto/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/producto.html'));
});

app.get('/api/productos/:id', (req, res) => {
    db.query('SELECT * FROM productos WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(results[0]);
    });
});
app.put('/api/cotizaciones/:id', soloAdmin, (req, res) => {    
    const { estado } = req.body;
    db.query('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
        if (err) {
            console.error('Error actualizando cotización:', err);
            return res.status(500).json({ error: 'Error al actualizar' });
        }
        res.json({ mensaje: 'Estado actualizado' });
    });
});
app.get('/api/usuarios/total', soloAdmin, (req, res) => {
    db.query('SELECT COUNT(*) AS total FROM usuarios', (err, results) => {
        if (err) {
            console.error('Error contando usuarios:', err);
            return res.status(500).json({ error: 'Error al contar usuarios' });
        }
        res.json({ total: results[0].total });
    });
});
app.get('/cuenta', verificarSesion, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cuenta.html'));
});

app.get('/api/cuenta', verificarSesion, (req, res) => {
    const { nombre, correo, rol } = req.session.usuario;
    res.json({ nombre, correo, rol });
});
app.get('/carrito', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/carrito.html'));
});
db.query(`CREATE TABLE IF NOT EXISTS ordenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    telefono VARCHAR(30),
    correo VARCHAR(255),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    metodo_pago VARCHAR(50),
    productos TEXT,
    total DECIMAL(12,2),
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => { if (err) console.error(err); });

app.get('/checkout', verificarSesion, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/checkout.html'));
});

app.post('/api/pedidos', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'Debes iniciar sesión' });
    const { nombre, telefono, correo, direccion, ciudad, metodo_pago, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Carrito vacío' });
    }
    const ids = items.map(i => Number(i.id));
    db.query('SELECT id, nombre, precio, stock FROM productos WHERE id IN (?)', [ids], (err, productos) => {
        if (err || productos.length === 0) {
            return res.status(500).json({ error: 'No se pudo crear el pedido' });
        }
        let total = 0;
        const partes = [];
        for (const it of items) {
            const p = productos.find(x => x.id === Number(it.id));
            if (!p) continue;
            const cant = Math.max(1, Math.min(Number(it.cantidad) || 1, 99));
            total += Number(p.precio) * cant;
            partes.push(p.nombre + ' x' + cant);
        }
        const lista = partes.join(', ');
        db.query(
            'INSERT INTO ordenes (nombre, telefono, correo, direccion, ciudad, metodo_pago, productos, total) VALUES (?,?,?,?,?,?,?,?)',
            [nombre, telefono, correo, direccion, ciudad, metodo_pago, lista, total],
            (err2, result) => {
                if (err2) {
                    console.error('Error creando pedido:', err2);
                    return res.status(500).json({ error: 'No se pudo crear el pedido' });
                }
                res.json({ id: result.insertId, total });
            }
        );
    });
});

app.get('/admin/pedidos', soloAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-pedidos.html'));
});
app.get('/admin/productos', soloAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-productos.html'));
});
app.get('/admin/cotizaciones-lista', soloAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin-cotizaciones.html'));
});
app.get('/api/pedidos', soloAdmin, (req, res) => {
    db.query('SELECT * FROM ordenes ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener pedidos' });
        res.json(results);
    });
});
app.put('/api/pedidos/:id', soloAdmin, (req, res) => {
    const { estado } = req.body;
    const validos = ['pendiente', 'pagado', 'enviado'];
    if (!validos.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }
    db.query('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar' });
        res.json({ mensaje: 'Estado actualizado' });
    });
});
db.query(`CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    telefono VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => { if (err) console.error(err); });

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/registro.html'));
});

app.post('/registro', (req, res) => {
    const { nombre, correo, telefono, password } = req.body;
    if (!nombre || !correo || !password || password.length < 6) {
        return res.redirect('/registro?error=datos');
    }
    db.query('SELECT id FROM clientes WHERE correo = ?', [correo], async (err, r) => {
        if (err) return res.redirect('/registro?error=1');
        if (r.length > 0) return res.redirect('/registro?error=existe');
        const hash = await bcrypt.hash(password, 10);
        db.query(
            'INSERT INTO clientes (nombre, correo, telefono, password) VALUES (?,?,?,?)',
            [nombre, correo, telefono, hash],
            (err2, result) => {
                if (err2) return res.redirect('/registro?error=1');
                req.session.usuario = { id: result.insertId, nombre, correo, rol: 'cliente' };
                res.redirect('/carrito');
            }
        );
    });
});
app.use((req, res) => res.status(404).send('Página no encontrada'));