// SPDX-License-Identifier: GPL-3.0-or-later
document.addEventListener('DOMContentLoaded', ()=> {
    const wrapper = document.getElementById('postlist-container');
    const container = document.getElementById('postlist');
    const btn = document.getElementById('previous-btn');
    const nomore = document.getElementById('previous-no-more');
    const template = document.getElementById('post-template');
    const isLazyLoadEnabled = (typeof THEME_SETTINGS !== 'undefined' && THEME_SETTINGS.lazyload && THEME_SETTINGS.lazyload.enable); 

    if (!wrapper || !container || !template || !btn) return;

    // 手写的url_for
    const getUrl = (rawurl) => {
        if (rawurl.startsWith('http://') || rawurl.startsWith('https://')) {
            return rawurl;
        } else {
            if (rawurl.startsWith('/')) {
                return window.origin + rawurl;
            } else {
                return window.origin + '/' + rawurl;
            }
        }
    }

    // 批量获取阅读量的函数
    const fetchBatchVercount = (elements) => {
        if (!elements || elements.length === 0) return;

        elements.forEach(element => {
            const postPath = element.getAttribute('data-path');
            const url = getUrl(postPath);
            const vercountUrl = "https://events.vercount.one/api/v2/log?url=" + encodeURIComponent(url);
            fetch(vercountUrl)
                .then(response => response.json())
                .then(data => {
                    const readTime = data['data']['page_pv'];
                    element.textContent = readTime;
                })
                .catch(error => {
                    console.error('Error fetching view count:', error);
                    element.textContent = '一些';
                });


        });


    }


    // 动画
    const observerOptions = {
        root: null, 
        rootMargin: '0px',
        threshold: 0.1 // 只要露出 10% 就触发
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 给卡片加动画
                entry.target.classList.add('animate');
                
                // 找到卡片紧跟的那个 hr，也加动画
                const nextHr = entry.target.nextElementSibling;
                if (nextHr && nextHr.tagName === 'HR') {
                    nextHr.classList.add('animate');
                }

                // 动画只播放一次，播放完就取消监听
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 封装一个“监听新元素”的函数
    const observeNewItems = () => {
        const cards = container.querySelectorAll('.post-card:not(.animate)');
        cards.forEach(card => observer.observe(card));
    };


    // 读取筛选条件和设置
    const filterTag = wrapper.getAttribute('data-filter-tag');
    const filterCategory = wrapper.getAttribute('data-filter-category');
    const batchSize = wrapper.getAttribute('data-per_page');

    let rawData = [];
    let activeList = [];
    let loadedCount = container.querySelectorAll('.post-card').length; // 已加载文章数
    let isDataFetched = false;

    observeNewItems(); // 监听初始加载的文章卡片

    // 日期格式化函数
    const formatDate = dateString => {
        const date = new Date(dateString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    const parseUrl = (url) => {
        if (/^(http|https|\/\/)/.test(url)) {
            return url;
        }
        return HEXO_SETTINGS.root + url.replace(/^\//, '');
    }
    
    const initData = async () => {
        if (isDataFetched) return;

        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            const res = await fetch('/search.json');
            if (!res.ok) {
                btn.textContent = 'Error when loading postlists';
                return;
            }

            const jsonData = await res.json();
            isDataFetched = true;

            rawData = activeList = Array.isArray(jsonData) ? jsonData : jsonData.posts;
            activeList = rawData;


            // filter
            if (filterTag && filterTag !== 'null' && filterTag !== '') {
                activeList = activeList.filter(p => p.tags && p.tags.some(t => t.name === filterTag || t === filterTag));
            }
            if (filterCategory && filterCategory !== 'null' && filterCategory !== '') {
            activeList = activeList.filter(p => p.categories && p.categories.some(c => c.name === filterCategory || c === filterCategory));
            }

            btn.textContent = 'Previous';
            btn.disabled = false;

        }  
        catch (error) {
            console.error('Error when fetching postlists:', error);
        } }
        
// 渲染函数
    const renderBatch = (posts) => {

    let newViewCountElements = [];

    const categoryName = {
        fanfiction: "同人文",
        talk: "个人杂谈",
        cut: "原作切片",
        translation: "同人汉化",
        doujin: "同人志",
        game: "同人游戏"
    };

    posts.forEach(post => {

        const clone = template.content.cloneNode(true);

        // 发布时间
        clone.querySelector(".post-date-text").textContent =
        post.date
        ? "发布于 " + formatDate(post.date)
        : "";

        // 标题
        const link = clone.querySelector(".post-card-link");
        link.href = post.url || ("/" + post.path);
        link.querySelector(".post-title").textContent = post.title;

        // 阅读量（保留你的代码）
        const readTimeSpan = clone.querySelector(".view-count");
        if (readTimeSpan) {
            const postUrl = post.url || ("/" + post.path);

            readTimeSpan.setAttribute(
                "data-path",
                getUrl(postUrl)
            );
            newViewCountElements.push(readTimeSpan);
        }

        // ------------------------
        // 分类
        // ------------------------

        const catContainer = clone.querySelector(".post-category-list");

        if (catContainer) {

            catContainer.innerHTML = "";

            const cats = Array.isArray(post.categories)
                ? post.categories
                : [];

            cats.forEach((cat, index) => {

                const name = cat.name || cat;

                const a = document.createElement("a");
                a.href = "/categories/" + name + "/";
                a.textContent = categoryName[name] || name;

                catContainer.appendChild(a);

                if (index < cats.length - 1) {
                    catContainer.appendChild(
                        document.createTextNode(", ")
                    );
                }

            });

        }

        // ------------------------
        // Tag
        // ------------------------

        const tagContainer =
            clone.querySelector(".post-tags-list");

        if (tagContainer) {

            tagContainer.innerHTML = "";

            const tags = Array.isArray(post.tags)
                ? post.tags
                : [];

            let currentLength = 0;
            const maxLen = 40;

            tags.forEach((tag, index) => {

                const name = tag.name || tag;

                if (currentLength + name.length > maxLen) {

                    tagContainer.appendChild(
                        document.createTextNode("...")
                    );

                    return;
                }

                currentLength += name.length;

                const wrapper =
                    document.createElement("div");
                wrapper.className = "post-tag-item";

                const a = document.createElement("a");
                a.href = "/tags/" + name + "/";
                a.className = "post-tag-link";
                a.textContent = name;

                wrapper.appendChild(a);

                tagContainer.appendChild(wrapper);

                if (
                    index < tags.length - 1 &&
                    currentLength < maxLen
                ) {
                    tagContainer.appendChild(
                        document.createTextNode(", ")
                    );
                }

            });

        }

        // ------------------------
        // 摘要 / 加密提示
        // ------------------------

        const excerpt =
            clone.querySelector(".post-excerpt");

        if (excerpt) {

            if (post.encrypt) {

                excerpt.textContent =
                    "【！】该文章已加密，需要密码才能阅读。";

            } else {

                excerpt.innerHTML =
                    post.excerpt || "";

            }

        }

        container.appendChild(clone);

        const hr = document.createElement("hr");
        container.appendChild(hr);

    });

    loadedCount += posts.length;

    observeNewItems();

    if (window.observeImages) {
        window.observeImages();
    }

    fetchBatchVercount(newViewCountElements);

}

btn.addEventListener('click', async () => {

    if (!isDataFetched) {
        await initData();
    }

    const nextBatch = activeList.slice(
        loadedCount,
        loadedCount + parseInt(batchSize)
    );

    if (nextBatch.length > 0) {
        renderBatch(nextBatch);
    }

    if (loadedCount >= activeList.length) {
        btn.style.display = 'none';
        nomore.style.display = 'block';
    }

});
    // 搜索页传入posts的接口
    window.setSearchResult = (postList) => {
        container.innerHTML = ''; // 清空
        loadedCount = 0;
        activeList = postList || [];
        isDataFetched = true;

    // 渲染第一批
    const size = parseInt(batchSize) || 10;
    const firstBatch = activeList.slice(0, size);
    renderBatch(firstBatch);

    // 控制按钮
    if (activeList.length > size) {
        btn.style.display = 'block';
        btn.textContent = 'Previous';
        btn.disabled = false;
    } else {
        btn.style.display = 'none';
        nomore.style.display = 'block';
    }
    };


});