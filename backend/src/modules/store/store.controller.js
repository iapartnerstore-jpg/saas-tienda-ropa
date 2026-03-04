export const getStoreSettings = async (req, res) => {
  try {
    // Simulación de datos (más adelante lo unimos a MySQL)
    const settings = {
      store_name: "modashop",
      primary_color: "#38bdf8",
      accent_color: "#22c55e",
      logo_url: ""
    };
    res.json(settings);
  } catch (err) {
    console.error("Error cargando configuración", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const { store_name, primary_color, accent_color, logo_url } = req.body;

    console.log("Datos recibidos:", req.body);
    // Guardarías estos valores en base de datos
    res.json({ message: "Configuración guardada correctamente" });
  } catch (err) {
    console.error("Error guardando configuración", err);
    res.status(500).json({ error: "No se pudo guardar la configuración" });
  }
};
