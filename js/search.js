// SPDX-License-Identifier: GPL-3.0-or-later

document.addEventListener("DOMContentLoaded", () => {

    const input = document.querySelector(".search-input-field");
    const button = document.querySelector(".search-input-btn");
    const result = document.querySelector(".search-result-list");
    const loading = document.querySelector(".search-result-loading");

    if (!input || !button || !result) return;

    const categoryName = {
        fanfiction: "同人文",
        talk: "个人杂谈",
        cut: "原作切片",
        translation: "同人汉化",
        doujin: "同人志",
        game: "同人游戏"
    };

    let posts = [];

    fetch("/content.json")
        .then(r => r.json())
        .then(data => {

            posts = data.posts || [];

            if (loading) {
                loading.style.display = "none";
            }

        })
        .catch(err => {

            console.error(err);

            if (loading) {
                loading.innerText = "读取失败";
            }

        });

    function formatDate(dateString) {

        if (!dateString) return "";

        return dateString.split("T")[0];

    }

    function render(list) {

        result.innerHTML = "";

        if (list.length === 0) {

            result.innerHTML = `
                <p style="text-align:center;padding:40px;color:#999;">
                    没有找到相关案宗。
                </p>
            `;

            return;
        }

        list.forEach(post => {

            const categories = (post.categories || [])
                .map(c => `
                    <a href="/categories/${c.slug}/">
                        ${categoryName[c.name] || c.name}
                    </a>
                `)
                .join("、");

            const tags = (post.tags || [])
                .map(tag => `
                    <div class="post-tag-item">
                        <a class="post-tag-link"
                           href="/tags/${encodeURIComponent(tag.slug)}/">
                            ${tag.name}
                        </a>
                    </div>
                `)
                .join("");

            const excerpt = (post.excerpt || "")
                .replace(/<[^>]+>/g, "");

            result.insertAdjacentHTML("beforeend", `

<section class="post-card">

<section class="post-info">

<span class="post-time">
<div class="post-time-icon"></div>
<h5>发布于 ${formatDate(post.date)}</h5>
</span>

<a class="post-card-link"
href="${post.permalink}">
<h3 class="post-title">
${post.title}
</h3>
</a>

<span class="post-meta-container">

${categories ? `
<span class="post-category">
<div class="post-category-icon"></div>
<h5 class="post-category-list">
${categories}
</h5>
</span>
` : ""}

${tags ? `
<span class="post-tags">
<div class="post-tag-icon"></div>
${tags}
</span>
` : ""}

</span>

<p>${excerpt}</p>

</section>

</section>

<hr>

`);

        });

    }

    function search() {

        const keyword = input.value
            .trim()
            .toLowerCase();

        if (!keyword) {

            result.innerHTML = "";

            return;
        }

        const list = posts.filter(post => {

            const title =
                (post.title || "").toLowerCase();

            const excerpt =
                (post.excerpt || "").toLowerCase();

            const cats =
                (post.categories || [])
                .map(c => c.name)
                .join(" ")
                .toLowerCase();

            const tags =
                (post.tags || [])
                .map(t => t.name)
                .join(" ")
                .toLowerCase();

            return (

                title.includes(keyword) ||

                excerpt.includes(keyword) ||

                cats.includes(keyword) ||

                tags.includes(keyword)

            );

        });

        render(list);

    }

    button.addEventListener("click", search);

    input.addEventListener("keydown", e => {

        if (e.key === "Enter") {

            search();

        }

    });

});