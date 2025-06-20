const {
  models: { Blog },
} = require('../../../lib/models');
const mongoose = require('mongoose');
//const { utcDateTime, randomString,parentage } = require('../../../../lib/util');

class BlogController {

  async home(req, res) {
    const limit = 6;
    let page = req.params.page || 1
    page = +page

    let { search } = req.query

    const total = await Blog.countDocuments({})

    let skip = 0;
    if (page > 1) {
      skip = parseInt(page - 1) * limit;
    }

    const qry = {
      isDeleted: false,
      isSuspended: false
    }

    if (search) {
      const searchValue = new RegExp(
        search
          .split(" ")
          .filter((val) => val)
          .map((value) => value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"))
          .join("|"),
        "i"
      );
      qry.$or = [
        { title: searchValue },
      ];
    }

    const blogs = await Blog.find(qry).sort({
      _id: -1
    }).skip(skip)
      .limit(limit)
      .lean()

    blogs.forEach(x => {
      x.description = removeTags(x.description)
    })

    let appendQs = ""
    if( search ){
      appendQs = `/?search=${search}`
    }

    let paging = initPagination({ page, total, itemsPerPage: 6, appendQs })

    return res.render('index', { paging, page, limit, total, blogs, search })
  }

  async details(req, res, next) {
    let { slug } = req.params;
    let blog = await Blog.findOne({ slug }).lean()
    let embedLink = ""
    if( blog.video ){
      embedLink = getYouTubeVideoId(blog.video)
    }
    return res.render('details', { blog,embedLink })
  }
}


function generatePaginationNumbers(currentPage, totalPages,appendQs) {
  let paginationHtml = '<ul class="pagination">';
  // First page link
  if (currentPage !== 1) {
    paginationHtml += `<li class="page-link disabled">
      <a href="/page/1">
        <img src="/img/arrow-left.png"alt="">
      </a>
    </li>`;
  } else {
    paginationHtml += `<li class="page-link">
      <a class="page-link" href="javascript:;">
        <img src="/img/arrow-left.png"alt="">
      </a>
    </li>`
  }

  // Previous page link
  if (currentPage > 1) {
    //paginationHtml += `<li class="page-item"><a class="page-link" href="/page/${currentPage-1}${appendQs}" data-page="(${currentPage-1})">Previous</a></li>`
  }

  // Page number links
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHtml += `<li class="page-item active" aria-current="page"><a class="page-link" href="javascript:;">${i}</a></li>`
    } else {
      paginationHtml += `<li class="page-item"><a class="page-link" href="/page/${i}${appendQs}" data-page="${i}">${i}</a></li>`;
    }
  }

  // Next page link
  if (currentPage < totalPages) {

    //paginationHtml += `<li class="page-item"><a  class="page-link" href="/page/${currentPage + 1}" data-page="(${currentPage + 1})">Next</a></li>`;
  }

  // Last page link
  if (currentPage !== totalPages) {
    //paginationHtml += '<li><a href="#" data-page="' + totalPages + '">Last</a></li>';
    paginationHtml += `<li class="page-item"><a class="page-link" href="/page/${totalPages}${appendQs}" data-page="${totalPages}"><img
											src="/img/arrow-right.png"
											alt=""></a></li>`;
  } else {
    paginationHtml += `<li class="page-item"><a class="page-link" href="javascript:void(0);" data-page="${totalPages}"><img
											src="/img/arrow-right.png"
											alt=""></a></li>`;
  }

  paginationHtml += '</ul>';
  return paginationHtml;
}


function initPagination({ total, page, itemsPerPage,appendQs }) {
  const totalPages = Math.ceil(total / itemsPerPage);
  const currentPage = page; // Set the current page here (you can also get it from the query parameter or other sources).
  return generatePaginationNumbers(currentPage, totalPages,appendQs);

}


function removeTags(str) {
  if ((str === null) || (str === ''))
    return false;
  else
    str = str.toString();
  return str.replace(/(<([^>]+)>)/ig, '');
}

function getYouTubeVideoId(url) {
  const youtubeRegex = /^(https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = url.match(youtubeRegex);

  if (match) {
    return match[2]; // The video ID is captured in the second group of the regex match.
  } else {
    return null; // Return null if the URL is not a valid YouTube URL.
  }
}

module.exports = new BlogController();

