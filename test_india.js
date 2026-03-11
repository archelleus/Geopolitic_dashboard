const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('http://127.0.0.1:8000/', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
        let text = [];
        let ds = viewer.dataSources.get(0);
        if(!ds) return ["No ds"];
        for (let i = 0; i < viewer.dataSources.length; i++) {
            if (viewer.dataSources.get(i).name && viewer.dataSources.get(i).name.includes('ne_110m')) {
                ds = viewer.dataSources.get(i);
                break;
            }
        }
        const entities = ds.entities.values;
        for (let e of entities) {
            let name = "Unknown";
            if(e.properties && e.properties.NAME) name = e.properties.NAME.getValue();
            if(name === 'India' || name === 'China' || name === 'Russia') {
                text.push(name + ": hasPolygon=" + !!e.polygon);
            }
        }
        return text;
    });
    console.log(result.join('\n'));
    await browser.close();
})();
