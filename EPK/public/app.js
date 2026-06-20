let epk = null;

async function init() {
    const res = await fetch('data/epk.json');
    epk = await res.json();
    document.getElementById("app").innerHTML = render(epk);
}

function render(data) {
    return data.layout.map(block => {
        const c = data.content[block.id];

        switch (block.type) {

            case "hero":
                return `
                <section class="hero">
                    <img src="${c.image}" alt="Dave Knowles">
                    <p class="caption">${c.caption || ""}</p>
                </section>`;

            case "bio":
                return `
                <section>
                    <h2>Biography</h2>
                    ${c.map(p => `<p>${p}</p>`).join("")}
                </section>`;

            case "offerings":
                return `
                <section>
                    <h2>Offerings</h2>
                    ${c.map(o => `
                        <div class="card">
                            <h3>${o.title}</h3>
                            <p>${o.description}</p>
                        </div>
                    `).join("")}
                </section>`;

            case "videos":
                return `
                <section>
                    <h2>Videos</h2>
                    ${c.map(v => `
                        <a class="link" target="_blank" href="${v.url}">
                            ▶ ${v.title}
                        </a>
                    `).join("")}
                </section>`;

            case "gallery":
                return `
                <section>
                    <h2>Gallery</h2>
                    <div class="grid">
                        ${c.map(g => `<img src="${g.src}" alt="Gallery">`).join("")}
                    </div>
                    <p><a href="gallery.html">View full gallery →</a></p>
                </section>`;

            default:
                return "";
        }
    }).join("");
}

init();
