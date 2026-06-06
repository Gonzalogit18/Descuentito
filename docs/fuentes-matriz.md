# Matriz de fuentes (Fase 0 - Investigacion)

Esta matriz se completa durante la **Fase 0** del proyecto, antes de programar
la ingesta. El objetivo es decidir, marca por marca, **de donde** y **como** se
van a obtener las promociones.

## Metodologia

1. **Buscar API oculta primero.** Abrir la pagina de promos de la marca, ir a
   DevTools -> pestania **Network** (filtrar por `Fetch/XHR`) y recargar. Muchos
   sitios cargan las promos desde un endpoint JSON interno. Si existe, es la
   opcion mas robusta y barata: se consume directo sin scrapear HTML.
2. **Preferir agregadores.** Buena parte de los descuentos no "viven" en la marca
   sino en el **banco o billetera** (MODO, Mercado Pago Beneficios, Galicia
   "Quiero!", etc.). Conviene scrapear esas fuentes agregadoras una sola vez y
   cubrir muchas marcas a la vez.
3. **HTML + LLM para el resto.** Cuando no hay API ni agregador, se baja el HTML,
   se limpia y se pasa a un LLM (gpt-4o-mini) que extrae el JSON estructurado.
   Es resiliente a cambios de maquetado (no depende de selectores CSS).
4. **Servicios de scraping para anti-bot.** Si el sitio requiere JS pesado o tiene
   anti-bot (Cloudflare, etc.), apuntar el HTTP Request a **ScrapingBee /
   ScraperAPI** con `render_js=true` y dejar que ellos resuelvan el navegador.

> Llenar las celdas con `Si / No / ?` y la URL/nombre concreto cuando aplique.

## Marcas

| Marca          | ¿Tiene API oculta? (URL endpoint JSON) | ¿La promo vive en banco/billetera? (cuál) | ¿Requiere JS/anti-bot? | Estrategia elegida (API / Agregador / HTML+LLM / ScrapingBee) | Notas |
|----------------|----------------------------------------|-------------------------------------------|------------------------|----------------------------------------------------------------|-------|
| Axion          | ?                                      | ? (¿Banco/AppBar?)                        | ?                      | ?                                                              |       |
| Shell          | ?                                      | ? (¿Shell Box / banco?)                   | ?                      | ?                                                              |       |
| YPF            | ?                                      | ? (¿App YPF / banco?)                      | ?                      | ?                                                              |       |
| Farmacity      | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |
| Starbucks      | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |
| Tea Connection | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |
| Nike           | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |
| Adidas         | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |
| Dexter         | ?                                      | ? (¿banco/billetera?)                      | ?                      | ?                                                              |       |

## Fuentes agregadoras (banco / billetera) a scrapear tambien

Estas suelen concentrar las promos de varias marcas; conviene tratarlas como
fuentes de primer nivel.

| Fuente                         | ¿Tiene API oculta? (URL endpoint JSON) | ¿Requiere JS/anti-bot? | Estrategia elegida | Notas |
|--------------------------------|----------------------------------------|------------------------|--------------------|-------|
| MODO                           | ?                                      | ?                      | ?                  | Agregador de muchos bancos. |
| Mercado Pago Beneficios        | ?                                      | ?                      | ?                  | Suele tener endpoint JSON interno. |
| Banco Galicia "Quiero!"        | ?                                      | ?                      | ?                  | Programa de beneficios Galicia. |
| Santander                      | ?                                      | ?                      | ?                  | Beneficios Santander. |
| BBVA                           | ?                                      | ?                      | ?                  | Beneficios BBVA. |
| Cuenta DNI (Banco Provincia)   | ?                                      | ?                      | ?                  | Fuerte en supermercados/comercios. |
