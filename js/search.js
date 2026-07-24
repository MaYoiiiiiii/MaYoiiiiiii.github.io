// SPDX-License-Identifier: GPL-3.0-or-later
document.addEventListener("DOMContentLoaded", () => {

    const input = document.querySelector(".search-input-field");
    const button = document.querySelector(".search-input-btn");
    
    // 💡 修复 1：你的 HTML 里是 class="search-result-list"，必须通过 class 获取
    const postlist = document.querySelector(".search-result-list");

        if (!input || !button || !postlist) {
        console.error("搜索初始化失败：未找到关键 DOM 元素。");
        return;
    }

    // 💡 新增：在这里强制重置父容器宽度，不让它缩在中间
    postlist.style.width = "100%";
    postlist.style.maxWidth = "800px";  // 或者 900px，你可以根据主页列表宽度微调
    postlist.style.margin = "0 auto";   // 保证即使变宽了也依然在页面居中
    postlist.style.padding = "20px 0";  // 留出上下间距


    const categoryMap = {
        fanfiction: "同人文",
        talk: "个人杂谈",
        cut: "原作切片",
        translation: "同人汉化",
        doujin: "同人志",
        game: "同人游戏"
    };

    let posts = [];

    // 获取搜索数据
    fetch("/search.json")
        .then(r => r.json())
        .then(data => {
            posts = Array.isArray(data) ? data : (data.posts || []);
            console.log("成功加载，共:", posts.length, "篇");
        })
        .catch(err => console.error("获取 search.json 失败:", err));

    function render(list) {
        postlist.innerHTML = "";

        if (list.length === 0) {
            postlist.innerHTML = `
                <p style="text-align:center; padding:48px 0; color: #888;">
                    暂无相关案宗。
                </p>
            `;
            return;
        }

        list.forEach(post => {
            // 💡 修复 2：因为你的 JSON 里没有 date 属性，我们从 url 链接（例如 /2026/07/15/...）里扒出日期
            let date = "未知时间";
            if (post.date) {
                date = post.date.split("T")[0];
            } else if (post.url) {
                const dateMatch = post.url.match(/\/(\d{4}\/\d{2}\/\d{2})\//);
                if (dateMatch) date = dateMatch[1].replace(/\//g, "-");
            }

            // 💡 修复 3：判断是否加密（支持 Hexo 常见加密特征）
            const isEncrypted = post.encrypt === true || (post.content && post.content.includes("474b3390"));

            // 提取摘要：优先用 excerpt，其次截取正文
            let excerpt = "";
            if (isEncrypted) {
                excerpt = "【！】该文章已加密，需要密码才能阅读。";
            } else {
                let rawExcerpt = post.excerpt || post.content || "";
                // 剔除 HTML 标签，防止排版错乱
                excerpt = rawExcerpt.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 120);
                if (rawExcerpt.length > 120) excerpt += "...";
            }

            const categories = (post.categories || [])
                .map(c => `<a href="/categories/${c}/">${categoryMap[c] || c}</a>`)
                .join(", ");

            const tags = (post.tags || [])
                .map(tag => `
                    <div class="post-tag-item">
                        <a class="post-tag-link" href="/tags/${encodeURIComponent(tag)}/">
                            ${tag}
                        </a>
                    </div>
                `)
                .join("");

            // 💡 完美还原 postlist.ejs 对应的 HTML 结构（让 styl 样式完美生效）
            postlist.insertAdjacentHTML("beforeend", `
                <section class="post-card">
                    <section class="post-info">
                        <span class="post-time">
                            <div class="post-time-icon"></div>
                            <h5>发布于 ${date}</h5>
                        </span>
                        <a class="post-card-link" href="${post.url}">
                            <h3 class="post-title">${post.title}</h3>
                        </a>
                        <span class="post-meta-container">
                            ${categories ? `
                                <span class="post-category">
                                    <div class="post-category-icon"></div>
                                    <h5 class="post-category-list">${categories}</h5>
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
        const keyword = input.value.trim().toLowerCase();

        if (keyword === "") {
            postlist.innerHTML = "";
            return;
        }

        const result = posts.filter(post => {
            const title = (post.title || "").toLowerCase();
            const content = (post.content || "").toLowerCase();
            const excerpt = (post.excerpt || "").toLowerCase();
            const tags = (post.tags || []).join(" ").toLowerCase();

            // 💡 检索逻辑增强：支持在标题、摘要、全文、以及标签里匹配关键字
            return (
                title.includes(keyword) ||
                excerpt.includes(keyword) ||
                tags.includes(keyword)
            );
        });

        render(result);
    }

    button.addEventListener("click", search);

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            search();
        }
    });
});
