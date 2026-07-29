// Qiita API のベースURL
const QIITA_API_BASE = 'https://qiita.com/api/v2';
const ARTICLES_PER_PAGE = 20;

const articleSearchForm = document.querySelector('#articleSearchForm');
const searchButton = document.querySelector('#searchButton');
const articleList = document.querySelector('#articleList');
const statusEl = document.querySelector('#status');
const emptyState = document.querySelector('#emptyState');
const summary = document.querySelector('#summary');
const articleItemTemplate = document.querySelector('#articleItemTemplate');

// 受け取った Date を YYYY-MM-DD 形式の文字列に整形する
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Qiitaの記事を取得する（本文は per_page 件）
const qiitaArticles = async (query) => {
    const response = await fetch(`${QIITA_API_BASE}/items?page=1&per_page=${ARTICLES_PER_PAGE}&query=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
};

// 詳細記事を取得する
const qiitaArticleDetail = async (id) => {
    const response = await fetch(`${QIITA_API_BASE}/items/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
};

// 検索中
const showLoading = () => {
    statusEl.textContent = '検索中…';
    statusEl.hidden = false;
    emptyState.hidden = true;
    articleList.innerHTML = '';
    summary.textContent = '';
};
// 成功（一覧を描画し、件数を表示）
const showResults = (articles) => {
    statusEl.hidden = true;
    emptyState.hidden = true;
    summary.textContent = `表示 ${articles.length}件`;
    createArticleList(articles);
};
// 該当なし（0件）
const showEmpty = () => {
    statusEl.hidden = true;
    articleList.innerHTML = '';
    summary.textContent = '';
    emptyState.textContent = '該当する記事が見つかりませんでした。別のキーワードで試してください。';
    emptyState.hidden = false;
};
// エラー
const showError = () => {
    articleList.innerHTML = '';
    summary.textContent = '';
    emptyState.hidden = true;
    statusEl.textContent = '取得に失敗しました。時間をおいて試してください。';
    statusEl.hidden = false;
};

// 検索ボタン押下時
articleSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = articleSearchForm.querySelector('input[name="articleSearchQuery"]').value.trim();
    if (!query) return;

    showLoading();
    searchButton.disabled = true;
    try {
        const articles = await qiitaArticles(query);
        if (articles.length === 0) {
            showEmpty();
            return;
        }
        showResults(articles);
    } catch (error) {
        showError();
    } finally {
        searchButton.disabled = false;
    }
});


// 記事リストを作成する
const createArticleList = (articles) => {
    articleList.innerHTML = '';
    articles.forEach(article => {
        // テンプレートから要素を複製してデータを流し込む
        const item = articleItemTemplate.content.firstElementChild.cloneNode(true);

        // ユーザー入力は innerHTML に直接埋め込まず、textContent で入れて XSS を防ぐ
        const author = article.user.name || article.user.id;
        const tags = article.tags.slice(0, 4).map(tag => `#${tag.name}`).join(' ');
        const avatar = item.querySelector('.article-avatar');
        avatar.src = article.user.profile_image_url;
        avatar.alt = author;
        item.dataset.id = article.id;
        item.querySelector('.article-title').textContent = article.title;
        item.querySelector('.article-author').textContent = `by ${author}`;
        item.querySelector('.article-tags').textContent = tags;
        item.querySelector('.likes-count').textContent = article.likes_count;
        item.querySelector('.article-date').textContent = formatDate(new Date(article.created_at));

        articleList.appendChild(item);
    });
};


//  詳細モーダル
const modalOverlay = document.querySelector('#modalOverlay');
const modalAvatar = document.querySelector('#modalAvatar');
const modalTitle = document.querySelector('#modalTitle');
const modalMeta = document.querySelector('#modalMeta');
const modalTags = document.querySelector('#modalTags');
const modalLikes = document.querySelector('#modalLikes');
const modalStocks = document.querySelector('#modalStocks');
const modalComments = document.querySelector('#modalComments');
const modalBody = document.querySelector('#modalBody');
const modalDates = document.querySelector('#modalDates');
const modalLink = document.querySelector('#modalLink');
const modalClose = document.querySelector('#modalClose');

// モーダルを開いて「読み込み中」にする
const openModalLoading = () => {
    modalTitle.textContent = '';
    modalMeta.textContent = '';
    modalTags.textContent = '';
    modalLikes.textContent = '';
    modalStocks.textContent = '';
    modalComments.textContent = '';
    modalDates.textContent = '';
    modalLink.href = '#';
    modalBody.textContent = '読み込み中…';
    modalOverlay.hidden = false;
};

// モーダルを閉じる
const closeModal = () => {
    modalOverlay.hidden = true;
};

// 取得した記事の詳細をモーダルに流し込む
const fillModal = (article) => {
    const author = article.user.name || article.user.id;
    modalAvatar.src = article.user.profile_image_url;
    modalAvatar.alt = author;
    modalTitle.textContent = article.title;
    modalMeta.textContent = `by ${author} ｜ 投稿 ${article.user.items_count} ｜ フォロワー ${article.user.followers_count}`;
    modalTags.textContent = article.tags.map(tag => `#${tag.name}`).join(' ');
    modalLikes.textContent = article.likes_count;
    modalStocks.textContent = article.stocks_count ?? '-';
    modalComments.textContent = article.comments_count;
    modalDates.textContent = `作成: ${formatDate(new Date(article.created_at))} ｜ 更新: ${formatDate(new Date(article.updated_at))}`;
    modalLink.href = article.url;
    modalBody.innerHTML = article.rendered_body;
};

// 一覧のカードをクリック
articleList.addEventListener('click', async (e) => {
    const item = e.target.closest('.article-item');
    if (!item) return;

    openModalLoading();
    try {
        const article = await qiitaArticleDetail(item.dataset.id);
        fillModal(article);
    } catch (error) {
        modalBody.textContent = '記事の取得に失敗しました。';
    }
});

// 閉じる：ボタン / オーバーレイ（背景）クリック / Escキー
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
});
