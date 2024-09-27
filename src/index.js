import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cors from "cors";
import translate from 'node-google-translate-skidz'; // Asegúrate de tener esta biblioteca instalada

const app = express();
const PORT = 3000; // Cambia a 3001 si es necesario
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Habilita CORS
app.use(cors());
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json()); // Middleware para parsear JSON


function traducirTexto(texto, idiomaOrigen = 'en', idiomaDestino = 'es') {
    return new Promise((resolve, reject) => {
        translate({
            text: texto,
            source: idiomaOrigen,
            target: idiomaDestino
        }, function(result) {
            if (result && result.translation) {
                resolve(result.translation);
            } else {
                console.error(`Error en la traducción del texto: "${texto}"`);
                reject(new Error('Error en la traducción'));
            }
        });
    });
}

// Ruta principal
app.get("/", async (req, res) => {
    try {
        const response = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/departments')
        const departamentos = response.data.departments;
        const departamentosTraducidos  = await Promise.all(departamentos.map(async (departamento) => {
            try {
                const nombreTraducido = await traducirTexto(departamento.displayName,'en', 'es');
                return {
                    ...departamento,
                    displayName:nombreTraducido
                };
            }catch (error) {
                console.error(`Error al traducir el departamento ${departamento.displayName}:`, error);
                return departamento;
            }
        }))
        
        res.render('index',{
            departamentosTraducidos 
        });
    }catch (error) {
        console.error('Error al obtener departamentos', error);
        res.status(500).send('Error en el servidor');
    }
});

// Ruta para buscar objetos 
app.get("/search", async (req, res) => {
    const departmentId = req.query.departmentId || "";
    const keyword = req.query.keyword || "";
    const geoLocation = req.query.location || "";

    let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?`;
    let hasParameter = false;

    if (departmentId) {
        url += `departmentId=${departmentId}`;
        hasParameter = true;
    }

    if (keyword) {
        url += hasParameter ? `&q=${encodeURIComponent(keyword)}` : `q=${encodeURIComponent(keyword)}`;
        hasParameter = true;
    }

    if (geoLocation) {
        url += hasParameter ? `&geoLocation=${encodeURIComponent(geoLocation)}` : `geoLocation=${encodeURIComponent(geoLocation)}`;
    }

    if (!hasParameter) {
        return res.status(400).json({ message: "Ingrese los parámetros de búsqueda." });
    }

    try {
        const response = await axios.get(url);

        if (response.data.total === 0) {
            return res.status(404).json({ message: "No se encontraron resultados para la búsqueda." });
        }

        const objects = await Promise.all(response.data.objectIDs.slice(0, 20).map(async id => {
            const objectResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            return objectResponse.data;
        }));

        // Traducir los objetos antes de enviarlos como respuesta
        const objetosTraducidos = await traducirObjetos(objects);
        
        res.json(objetosTraducidos); // Envía los objetos traducidos como respuesta
    } catch (error) {
        console.error("Error fetching data from the API:", error.message);
        res.status(500).json({ message: "Error al buscar datos." });
    }
});

// Ruta para obtener detalles 
app.get("/object/:objectID", async (req, res) => {
    const objectID = req.params.objectID;

    try {
        const response = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`);
        const objectData = response.data;

        res.render("object", { object: objectData });
    } catch (error) {
        console.error("Error fetching object details:", error.message);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});



