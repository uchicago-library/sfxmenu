(function($) {
  var debug = false;

  var contains = function(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
      indexOf = Array.prototype.indexOf;
    } else {
      indexOf = function(needle) {
        var i = -1, index = -1;
        for(i = 0; i < this.length; i++) {
          var item = this[i];

          if((findNaN && item !== item) || item === needle) {
            index = i;
            break;
          }
        }
        return index;
      };
    }
    return indexOf.call(this, needle) > -1;
  };

  /* parse_query_string(q)
   * input:  the query string of a URL, i.e., everything after the question
   *         mark.
   * output: a javascript object where the keys are the names of URL parameters
   *         and the values are parameter values.
   */

  function parse_query_string(q) {
    var vars = q.split("&");
    var query_string = {};
    for (var i = 0; i < vars.length; i++) {
      // Wrap this in a try/except in case the URL passed to SFX can't be
      // decoded with decodeURIComponent. 
      try {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
          query_string[pair[0]] = decodeURIComponent(pair[1]);
          // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
          var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
          query_string[pair[0]] = arr;
          // If third or later entry with this name
        } else {
          query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
      } catch (err) {
        continue;
      }
    }
    return query_string;
  }

  /* get the title of a book. Journals should return the empty string- see also
   * get_journal_title and get_article_title. The function checks URL parameters
   * first, and if those are not present it falls back to SFX template variables 
   * for book title or title. 
   * input:  params (the output of parse_query_string)
   * output: book title (a string)
   */

  function get_title(params) {
    if  (get_genre(params) == 'journal') {
      return '';
    }

    var check = ['rft.btitle', 'btitle', 'rft.title', 'title'];
    for (var i = 0; i < check.length; i++) {
      if (check[i] in params && params[check[i]]) {
        return params[check[i]];
      }
    }
    var btitle = $('#sfx_btitle').text();
    if (btitle) {
      return btitle;
    }
    var title = $('#sfx_title').text();
    if (title) {
      return title;
    }
    return '';
  }

  /* This function is only valid for articles or journals- other types of items
   * should return the empty string. It checks URL parameters first, and if 
   * thise are not present it falls back to SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: journal title (a string)
   */

  function get_journal_title(params) {
    var genre = get_genre(params);
    if  (genre == 'article' || genre == 'journal') {
      var check = ['rft.jtitle', 'rft.title', 'title'];
      for (var i = 0; i < check.length; i++) {
        if (check[i] in params && params[check[i]]) {
          return params[check[i]];
        }
      }
      var title = $('#sfx_title').text();
      if (title) {
        return title;
      } else {
        return '';
      }
    } else {
      return '';
    }
  }

  /* This function is only valid for articles or chapters- other types of items
   * should return the empty string. It checks URL parameters first, and if
   * thise are not present it falls back to SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: article title (a string)
   */

  function get_article_title(params) {
    var check = ['rft.atitle', 'atitle'];
    for (var i = 0; i < check.length; i++) {
      if (check[i] in params && params[check[i]]) {
        return params[check[i]];
      }
    }
    var atitle = $('#sfx_atitle').text();
    if (atitle) {
      return atitle;
    }
    return '';
  }

  /* Get the SID.
   */

  function get_sid(params) {
    if ('sid' in params && params['sid']) {
      return params['sid'];
    }
    return '';
  }

  /* Get an author's first name. 
   * This checks SFX template variables first, and falls back to URL parameters
   * otherwise.
   * input:  params (the output of parse_query_string)
   * output: author first name (a string)
   */

  function get_aufirst(params) {
    var aufirst = $('#sfx_aufirst').text();
    if (aufirst) {
      return aufirst;
    }
    var check = ['rft.aufirst', 'aufirst'];
    for (var i = 0; i < check.length; i++) {
      if (check[i] in params && params[check[i]]) {
        return params[check[i]];
      }
    }
    return '';
  }

  /* Get an author's last name. 
   * This checks SFX template variables first, and falls back to URL parameters
   * otherwise.
   * input:  params (the output of parse_query_string)
   * output: author last name (a string)
   */

  function get_aulast(params) {
    var aulast = $('#sfx_aulast').text();
    if (aulast) {
      return aulast;
    }
    var check = ['rft.aulast', 'aulast'];
    for (var i = 0; i < check.length; i++) {
      if (check[i] in params && params[check[i]]) {
        return params[check[i]];
      }
    }
    return '';
  }

  /* Get an author's name, in "last name, first name" format. 
   * input:  params (the output of parse_query_string)
   * output: author name (a string)
   */

  function get_author(params) {
    var author = [];

    var aulast = get_aulast(params);
    if (aulast) {
      author.push(aulast);
    }
    var aufirst = get_aufirst(params);
    if (aufirst) {
      author.push(aufirst);
    }
    return author.join(', ');
  }

  /* Get the genre of an item. Begin by checking URL parameters, but ignore
   * "unknown" as a value. Fall back to SFX template variables if necessary:
   * assume that if a btitle is present this is a book, otherwise if an atitle
   * is present this must be an article, otherwise if an ISSN is present this
   * must be a journal. 
   * input:  params (the output of parse_query_string)
   * output: genre (a string)
   */

  function get_genre(params) {
    var check = ['genre'];
    var genre = '';
    for (var i = 0; i < check.length; i++) {
      if (check[i] in params && params[check[i]]) {
        genre = params[check[i]];
      }
    }
    if (genre && genre != 'unknown') {
      return genre;
    }

    var rfr_id = params['rfr_id'];

    var atitle = $('#sfx_atitle').text();
    var btitle = $('#sfx_btitle').text();
    var issn = get_issn(params);
    if (btitle) {
      return 'book';
    } else if (atitle) {
      return 'article';
    } else if (issn) {
      return 'journal';
    } else if (rfr_id == 'info:sid/sfxit.com:journalsearch') {
      return 'journal';
    } else {
      return '';
    }
  }

  /* Get an ISBN. First check URL parameters, and fall back to SFX template
   * variables if necessary. Validate the ISBN: be sure it contains only digits,
   * dashes, and the character "X".
   * input:  params (the output of parse_query_string)
   * output: ISBN (a string)
   */

  function get_isbn(params) {
    var isbn = '';
    if ('isbn' in params && params['isbn']) {
      isbn = params['isbn'];
    }
    var params = parse_query_string($('#sfx_openurl').text().replace(/^[^?]*\?/, ''));
    if (params['rft.isbn']) {
      isbn = params['rft.isbn'];
    }
    if (isbn.match(/^[X0-9-]+$/)) {
      return isbn;
    } else {
      var isbns = $('#sfx_isbn').text().split(';');
      if (isbns.length > 0) {
        return isbns[0].trim();
      }
    }
  }

  /* Get an ISSN from SFX template variables. 
   * input:  params (the output of parse_query_string)
   * output: ISSN (a string)
   */

  function get_issn(params) {
    var issn = $('#sfx_issn').text();
    if (issn) {
      return issn;
    } else { return '';
    }
  }

  /* Get an OCLC number from URL parameters.
   * input:  params (the output of parse_query_string)
   * output: OCLC number (a string)
   */

  function get_oclcnum(params) {
    if ('rft.oclcnum' in params) {
      return params['rft.oclcnum'];
    } else if ('sid' in params && params['sid'] == 'FirstSearch:WorldCat' && 'pid' in params) {
      var matches = params['pid'].match(/<accession number>(.*)<\/accession number>/);
      if (matches.length >= 2) {
        return matches[1];
      } else {
        return '';
      }
    } else {
      return '';
    }
  }

  /* Get the volume number from SFX template variables. 
   * input:  params (the output of parse_query_string)
   * output: volume number (a string)
   */

  function get_volume(params) {
    var volume = $('#sfx_volume').text();
    if (volume) {
      return volume;
    } else {
      return '';
    }
  }

  /* Get the issue number from SFX template variables. 
   * input:  params (the output of parse_query_string)
   * output: issue number (a string)
   */

  function get_issue(params) {
    var issue = $('#sfx_issue').text();
    if (issue) {
      return issue;
    } else {
      return '';
    }
  }

  /* Get the month as text, e.g. "January" from SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: month (a string)
   */

  function get_month(params) {
    var month_array = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var month_index = $('#sfx_month').text();
    if (month_index) {
      return month_array[parseInt(month_index) - 1];
    }
    return ''; 
  }

  /* Get the start page of a journal article from SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: start page (a string)
   */
 
  function get_spage() {
    var spage = $('#sfx_spage').text();
    if (spage) {
      return spage;
    } else {
      return '';
    }
  }

  /* Get the end page of a journal article from SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: end page (a string)
   */

  function get_epage() {
    var epage = $('#sfx_epage').text();
    if (epage) {
      return epage;
    } else {
      return '';
    }
  }

  /* Get the date from URL parameters.
   * input:  params (the output of parse_query_string)
   * output: date (a string)
   */

  function get_date(params) {
    if ('rft.date' in params) {
      return params['rft.date'];
    } else {
      return '';
    }
  }

  /* Get the year from URL parameters or SFX template variables. 
   * input:  params (the output of parse_query_string)
   * output: year (a string)
   */

  function get_year(params) {
    var d = get_date(params);
    var matches = d.match(/([0-9]{4})/);
    if (matches && matches.length > 0) {
      return matches[1];
    } else {
      var year = $('#sfx_year').text();
      if (year) {
        return year;
      } else {
        return '';
      }
    }
  }

  /* get the page range, e.g. "11-20".
   * input:  (none)
   * output: page range (a string)
   */

  function get_page_range() {
    var pages = [];
    var spage = get_spage();
    if (spage) {
      pages.push(spage);
    }
    var epage = get_epage();
    if (epage) {
      pages.push(epage);
    }
    return pages.join('-');
  }

  /* Get a citation from URL parameters or SFX template variables.
   * input:  params (the output of parse_query_string)
   * output: year (a string)
   */

  function get_citation(params) {
    var genre = get_genre(params);
    var html = '';
    if (genre == 'article') {
      html = '';
      volume_issue = [];
  
      var volume = get_volume(params);
      if (volume) {
        volume_issue.push(volume);
      }
  
      var issue = get_issue(params);
      if (issue) {
        volume_issue.push('no. ' + issue); 
      }
      html = html + volume_issue.join(', ');
  
      // date
      var month = get_month(params);
      var date = '';
      if (month) {
        date = month;
      }
  
      var day = $('#sfx_day').text();
      if (day) {
        date = date + ' ' + day;
      }
  
      var year = $('#sfx_year').text();
      if (year) {
        if (date) {
          date = date + ', ';
        }
        date = date + year;
      }
      
      if (date) {
        html = html + ' (' + date + ')';
      }

      var page_range = get_page_range();
      if (page_range) {
        html = html + ': p.' + page_range;
      }
    } else if (genre == 'bookitem') {
      var page_range = get_page_range();
      if (page_range) {
        html = html + 'p.' + page_range;
      }
    }

    return html;
  }

  /* Get a human-readable location.
   * input:  location code.
   * output: location (a string)
   */

  function get_human_readable_location(l) {
    var locations = {
      'UC': 'University of Chicago',
      'UCX': 'University of Chicago',
      'ResupS': 'Needed for Reserve Next Quarter; Ask at SSA Circulation Desk',
      'MSSASR': 'Special Collections, Manuscripts',
      'ARCHASR': 'Special Collections, Archives',
      'RareASR': 'Special Collections, Rare Books',
      'RARECRASR': 'Special Collections, Crerar Rare Books',
      'RecASR': 'Mansueto, Recordings',
      'ERICMic': 'Regenstein, B Level, ERIC Microfiche Collection',
      'Pam': 'Regenstein, B Level, Social Service Pamphlet Collection',
      'SSADiss': 'Social Service Administration, Dissertations',
      'CDEV': 'Regenstein, 1st Floor, Graduate Career Development Resources Collection',
      'SciRR': 'Crerar, 1st Floor Reference Collection',
      'SciHY': 'Crerar, Lower Level, Harvard-Yenching Collection',
      'POLSKY': 'IT Services at Polsky',
      'POLadap': 'Polsky Center, IT Services TECHB@R',
      'POLcaco': 'Polsky Center, IT Services TECHB@R',
      'POLipad': 'Polsky Center, IT Services TECHB@R',
      'POLlap': 'Polsky Center, IT Services TECHB@R',
      'BTAASPR': 'Shared Print Repository',
      'ClosedGen': 'Regenstein Closed Stack, Place Hold for Pickup',
      'ClosedCJK': 'Regenstein Closed Stack, Place Hold for Pickup',
      'JzAr': 'Chicago Jazz Archive: Ask at Special Collections',
      'MapCl': 'Regenstein, Room 370, Map Collection',
      'MapRef': 'Regenstein, Room 370, Map Reference Collection',
      'Mic': 'Regenstein, 3rd Floor Microforms',
      'MidEMic': 'Regenstein, 5th Floor Middle East Microforms',
      'Rec': 'Regenstein, Room 360, Recordings Collection',
      'RecHP': 'Regenstein, Headphones: Ask at Room 360',
      'ITS': 'IT Services at Regenstein',
      'JRLRES': 'Regenstein, 1st Floor Reserve Desk',
      'Resup': 'Needed for Reserve Next Quarter: Ask at Regenstein, 1st Floor Circulation',
      'RR': 'Regenstein, General Reference: A-L on 2nd Floor, M-Z on 3rd Floor',
      'RR2Per': 'Regenstein, 2nd Floor Current Periodicals & Newspapers',
      'RR4': 'Regenstein, 4th Floor Religion and Ancient Near East Reference Collection',
      'RR4Cla': 'Regenstein, Room 470, Classics Reading Room',
      'RR4J': 'Regenstein, 4th Floor Judaica Reference Collection',
      'RR5': 'Regenstein, 5th Floor Middle Eastern Reference Collection',
      'RR5EA': 'Regenstein, Room 520, East Asian Reference Collection, Western Language',
      'RR5EPer': 'Regenstein, Room 520, East Asian Reference Collection, Western Language Periodicals',
      'RR5Per': 'Regenstein, 5th Floor Middle East & South Asia Current Periodicals & Newspapers',
      'RRExp': 'Regenstein, 1st Floor Reference Desk Collection',
      'SAsia': 'Regenstein, Room 560, South Asia Arrearage',
      'Ser': 'Regenstein, Serials Department: Ask at 1st Floor Reference Desk',
      'SerArr': 'Regenstein, Serials Department: Ask at 1st Floor Reference Desk',
      'SerCat': 'Regenstein, Serials Cataloging Department: Ask at 1st Floor Reference Desk',
      'LMC': 'Logan Media Center Cage',
      'Slav': 'Regenstein, 4th Floor Slavic Reference Collection',
      'SOA': 'Regenstein, 5th Floor Southern Asia Reference Collection',
      'W': 'Regenstein, Bookstacks',
      'WCJK': 'Regenstein, 5th Floor Bookstacks, East Asian/CJK',
      'LMCacc': 'Logan Media Center, Kit Accessories',
      'LMCcabl': 'Logan Media Center, Accessories',
      'LMCexib': 'Logan Media Center, Exhibition Equipment',
      'LMCgear': 'Logan Media Center Cage',
      'LMCstaf': 'Logan Media Center, Staff-authorized Equipment',
      'MCSX': 'Monographs classified separately',
      'MCS': 'MCS',
      'AmDrama': 'Special Collections, American Drama',
      'AmNewsp': 'Special Collections, American Newspapers',
      'Arch': 'Special Collections, Archives',
      'ArcMon': 'Special Collections, Archival Monographs',
      'ArcRef1': 'Special Collections, Archival Reference',
      'ArcSer': 'Special Collections, Archival Serials',
      'Atk': 'Special Collections, Atkinson Collection of American Drama',
      'Aust': 'Special Collections, Austrian Collection of Drama',
      'Drama': 'Special Collections, Drama Collection',
      'EB': 'Special Collections, EB Children\'s Literature',
      'Intrnet': 'Online',
      'French': 'Special Collections, French Plays',
      'Incun': 'Special Collections, Incunabula',
      'JzMon': 'Special Collections, Chicago Jazz Archive Monographs',
      'JzRec': 'Chicago Jazz Archive Album Collection: Ask at Special Collections',
      'Linc': 'Special Collections, Lincoln Collection',
      'Lincke': 'Special Collections, Lincke Collection of Popular German Literature',
      'MoPoRa': 'Special Collections, Modern Poetry',
      'Mss': 'Special Collections, Manuscripts',
      'MssBG': 'Special Collections, Manuscripts, Butler-Gunsaulus Collection',
      'MssCdx': 'Special Collections, Codex Manuscripts',
      'ASRHP': 'Headphones: Ask at Mansueto Circulation',
      'MssCr': 'Special Collections, Crerar Manuscripts',
      'MssJay': 'Special Collections, Manuscripts, Frank Webster Jay Collection',
      'MssLinc': 'Special Collections, Lincoln Miscellaneous Manuscripts',
      'MssMisc': 'Special Collections, Miscellaneous Manuscripts Collection',
      'MssSpen': 'Special Collections, Manuscripts, William M. Spencer Collection',
      'RaCrInc': 'Special Collections, Crerar Incunabula',
      'Rare': 'Special Collections, Rare Books',
      'RareCr': 'Special Collections, Crerar Rare Books',
      'RBMRef': 'Special Collections, Rare Book and Manuscript Reference',
      'RefA': 'Special Collections, Reference, A-Level',
      'GameASR': 'Mansueto, Games',
      'Rege': 'Special Collections, Helen and Ruth Regenstein Collection of Rare Books',
      'Rosen': 'Special Collections, Ludwig Rosenberger Library of Judaica',
      'SpClAr': 'Special Collections, Arrearage',
      'UCPress': 'Special Collections, University of Chicago Press Imprint Collection',
      'SSAdX': 'Social Service Administration',
      'SSAdBdP': 'Social Service Administration, Journals',
      'SSAdDep': 'Social Service Administration: Ask at Circulation',
      'SSAdDpY': 'Social Service Administration, Dissertation Proposals',
      'SSAdMed': 'Social Service Administration, Multimedia',
      'SSAdMic': 'Social Service Administration, Microforms',
      'HarpASR': 'Mansueto',
      'SSAdPer': 'Social Service Administration, Journals',
      'SSAdRef': 'Social Service Administration, Reference',
      'SSAdRes': 'Social Service Administration, Reserve',
      'Order': 'On order',
      'InProc': 'Received; in process',
      'Staff': 'Staff Collection',
      'unk': 'unknown',
      'Online': 'Online',
      'FullText': 'Full Text',
      'JRLASR': 'Mansueto',
      'Related': 'Related',
      'BorDirc': 'Interlibrary Loan, BorrowDirect, UBorrow',
      'ACASA': 'Special Collections, Archives of Czechs and Slovaks Abroad',
      'HCB': 'Special Collections, Historical Children?s Book Collection',
      'LawDisp': 'D\'Angelo Law, 3rd floor, Fulton Room',
      'Res': 'Needed for Reserve Next Quarter; Ask at Regenstein Circulation Desk',
      'AANet': 'Internet',
      'LawSupr': 'Mansueto',
      'RRADiss': 'Mansueto',
      'SciASR': 'Mansueto',
      'Law': 'D\'Angelo Law, Bookstacks',
      'LawA': 'D\'Angelo Law, Alumni Collection: Request from Storage',
      'LawAcq': 'D\'Angelo Law, Acquisitions Department: Ask at Law Circulation',
      'LawAid': 'D\'Angelo Law, Legal Aid Clinic',
      'LawAnxN': 'D\'Angelo Law, North Annex: Request from Storage',
      'LawAnxS': 'D\'Angelo Law, South Annex: Request from Storage',
      'LawASR': 'Mansueto',
      'ASR': 'Mansueto Library',
      'LawC': 'D\'Angelo Law, Chicago Collection: Request from Storage',
      'LawCat': 'D\'Angelo Law, Cataloging Department: Ask at Law Circulation',
      'LawCity': 'D\'Angelo Law, City Collection',
      'LawCS': 'D\'Angelo Law, Career Services',
      'LawFul': 'D\'Angelo Law, Fulton Room',
      'LawMic': 'D\'Angelo Law, Microforms, Request from Storage',
      'LawMicG': 'Regenstein, 3rd Floor Law Microforms',
      'LawPer': 'D\'Angelo Law',
      'LawRar': 'D\'Angelo Law, Rare Book Room: Request from Storage',
      'LawRef': 'D\'Angelo Law, Reference',
      'DLL': 'D\'Angelo Law',
      'LawRes': 'D\'Angelo Law Reserve Room',
      'LawResC': 'D\'Angelo Law Reserve Room',
      'LawResP': 'D\'Angelo Law Reserve Room',
      'LawRR': 'D\'Angelo Law, Reading Room',
      'LawStor': 'D\'Angelo Law, Storage: Request from Storage',
      'ResupD': 'Needed for Reserve Next Quarter; Ask at D\'Angelo Law Circulation Desk',
      'EckX': 'Eckhart',
      'Eck': 'Eckhart',
      'EckRef': 'Eckhart, Reference',
      'EckRes': 'Eckhart, Reserve',
      'EMedia': 'Eckhart, Multimedia: Ask at Circulation',
      'ERes': 'On electronic reserve',
      'ResupE': 'Needed for Reserve Next Quarter; Ask at Eckhart Circulation Desk',
      'ITSadap': 'Regenstein, 1st Floor, IT Services TECHB@R',
      'ITScaco': 'Regenstein, 1st Floor, IT Services TECHB@R',
      'ITSipad': 'Regenstein, 1st Floor, IT Services TECHB@R',
      'ITSlap': 'Regenstein, 1st Floor, IT Services TECHB@R',
      'JCL': 'Crerar',
      'PerBio': 'Crerar, 1st Floor, Current Periodicals',
      'PerPhy': 'Crerar, 1st Floor, Current Periodicals',
      'ResupC': 'Needed for Reserve Next Quarter; Ask at Crerar Circulation Desk',
      'Sci': 'Crerar, Lower Level, Bookstacks',
      'SciDDC': 'Crerar, Lower Level, Dewey Collection',
      'JRL': 'Regenstein',
      'SciLg': 'Crerar, Lower Level, Folios/Oversized',
      'SciMic': 'Regenstein, B Level, Science Microforms',
      'SciRef': 'Crerar, Lower Level Reference Collection',
      'SciRes': 'Crerar, 1st Floor Reserve Desk',
      'SFilm': 'Crerar, Lower Level, Film/DVD Collection: Take Container to Circulation for Checkout',
      'SMedia': 'Crerar, Lower Level, Digital Media Collection',
      'SMicDDC': 'Regenstein, B Level, Science Microforms',
      'SPCL': 'Special Collections',
      'Acq': 'Regenstein, Acquisitions Department: Ask at 1st Floor Reference Desk',
      'ArtResA': 'Regenstein, Room 420, East Asian Art Collection',
      'Cat': 'Regenstein, Cataloging Department: Ask at 1st Floor Reference Desk',
      'CircPer': 'Ask at Regenstein 1st Floor Circulation',
      'CJK': 'Regenstein, 5th Floor Bookstacks, East Asian/CJK',
      'CJKRar': 'Regenstein, East Asian Treasure Room: Ask in Room 525',
      'CJKRef': 'Regenstein, Room 520, East Asian Reference Collection',
      'SSAd': 'Social Service Administration',
      'CJKRfHY': 'Regenstein, Room 520, East Asian Reference Collection',
      'CJKSem': 'Wiebolt Hall, East Asia Seminar Room',
      'CJKSPer': 'Regenstein, Room 520, East Asian Periodicals',
      'CJKSpHY': 'Regenstein, East Asian Treasure Room: Ask in Room 525',
      'CJKSpl': 'Regenstein, East Asian Reading Room, Closed Bookstacks: Ask in Room 525',
      'CMC': 'Regenstein, Room 505, K-12 Curriculum Materials Collection',
      'Film': 'Regenstein, 2nd and 3rd Floor Video/DVD Collection',
      'Gen': 'Regenstein, Bookstacks',
      'GenHY': 'Regenstein 5th Floor Bookstacks, Harvard Yenching/CJK',
    }
    if (locations.hasOwnProperty(l)) {
      return locations[l];
    } else {
      return '';
    }
  }

  /* This script uses what seems like a pretty fragile approach: to get links
   * directly to journal articles, we render the links and hidden forms that
   * SFX would have rendered, but we place all of them into a hidden div. 
   * Then, working from the possibly deduped link text that is returned from
   * the holdings service, we get a form that can be submitted to take the user
   * directly to their article. 
   * input:  link text (a string)
   * output: form to submit (a jQuery element)
   */

  function get_sfx_form(link_text) {
    var form = null;
    $('#sfxforms a').each(function() {
      var sfx_link = $(this);
      var sfx_link_text = sfx_link.text().replace(/^\s+|\s+$/g, '');
      if (sfx_link_text == link_text) {
        var params = sfx_link.attr('href').replace(/^.*\(|\).*$/g, '').split(',');
        var formname = params[1].replace(/['"]/g, '');
        form = $('form[name="' + formname + '"]');
      }
    });
    if (form !== null) {
      return form;
    } else {
      return $([]);
    }
  }

  /* Helper function for get_coverage_string.
   */

  function get_coverage_string_chunk(coverage_chunk) {
    var s = '';
    if (coverage_chunk['year']) {
      s = s + coverage_chunk['year'].toString();
    }
    if (coverage_chunk['volume']) {
      s = s + ' volume: ' + coverage_chunk['volume'].toString();
    }
    if (coverage_chunk['issue']) {
      s = s + ' issue: ' + coverage_chunk['issue'].toString();
    }
    return s;
  }
  
  /* a function to get the coverage (year volume and issue) of a journal. 
   */

  function get_coverage_string(coverage) {
    return get_coverage_string_chunk(coverage[0]) + ' -- ' + get_coverage_string_chunk(coverage[1]);
  }

  function get_doi(params) {
    if ('rft.id' in params && params['rft.id'].substring(0, 5) == 'info:') {
      return params['rft.id'].substring(5);
    }
  }

    // MT : toDayMonth

    // prose string representation of embargo measured in months

    // > toDayMonth(0);
    // ''
    // > toDayMonth(1);
    // 'Most recent 1 month(s) not available'
    // > toDayMonth(12);
    // 'Most recent 1 year(s) not available'
    // > toDayMonth(15);
    // 'Most recent 1 year(s) 3 month(s) not available'
    // > toDayMonth(64);
    // 'Most recent 5 year(s) 4 month(s) not available'

    var toDayMonth = function (mns) {
	var years = Math.floor(mns / 12);
	var months = mns % 12;
	if ((years !== 0) && (months !== 0)) {
	    return ('Most recent ' + years + ' year(s) ' + months + ' month(s) not available')
	} else if (years !== 0) {
	    return ('Most recent ' + years + ' year(s) not available')
	} else if (mns < 1) {
	    return ""
	} else {
	    return ('Most recent ' + months + ' month(s) not available')
	}
    }



  $.fn.titlesection = function() {
    var self = this;

    var params = parse_query_string(
      self.data('openurl').replace(/^[^?]*\?/, '')
    );

    var genre = get_genre(params);
    var output = [];

    /* depending on the genre of the item in question, we display the title
     * section of the page differently. Items like journal articles have
     * citation information that doesn't appear for books. 
     */

    if (genre == 'book') {
        var title = get_title(params);
        if (title) {
            self.append('<h1>' + title + '</h1>');
        }

        var author = get_author(params);
        if (author) {
          self.append('<h2>' + author + '</h2>');
        }
    } else if (genre == 'bookitem') {
      var chapter_title = get_article_title(params);
      if (chapter_title) {
        self.append('<h1>' + chapter_title + '</h1>');
      }
      var author = get_author(params);
      if (author) {
        self.append('<h2>' + author + '</h2>');
      }
        
      var title = get_title(params);
      if (title) {
        self.append('<h2>from: ' + title + '</h2>');
      }
      var citation = get_citation(params);
      if (citation) {
        output.push(citation);
      }
    } else if (genre == 'journal') {
      var title = get_journal_title(params);
      if (title) {
        self.append('<h1>' + title + '</h1>');
      }
      var author = get_author(params);
      if (author) {
        self.append('<h2>' + author + '</h2>');
      }
    } else if (genre == 'article') {
      var article_title = get_article_title(params);
      if (article_title) {
        self.append('<h1>' + article_title + '</h1>');
      }
      var author = get_author(params);
      if (author) {
        self.append('<h2>' + author + '</h2>');
      }
      var journal_title = get_journal_title(params);
      if (journal_title) {
        output.push('<em>' + journal_title + '</em>');
      }
   
      var citation = get_citation(params);
      if (citation) {
        output.push(citation);
      }

      var doi = get_doi(params);
      if (doi) {
        output.push(doi);
      }
    }

    if (get_citation(params) == '') {
      var date = get_date(params);
      if (date) {
        output.push('(' + date + ')');
      }
    }

    var isbn = get_isbn(params);
    if (isbn) {
      output.push('ISBN: ' + isbn);
    }

    var issn = get_issn(params);
    if (issn) {
      output.push('ISSN: ' + issn);
    }

    var oclcnum = get_oclcnum(params);
    if (oclcnum) {
      output.push('OCLC # ' + oclcnum);
    }

    if (output) {
      self.append('<p>' + output.join(' ') + '</p>');
    }
  }




    $.fn.holdingssectionNew = function() {
	var self = this;
	
	var params = parse_query_string(
	    self.data('openurl').replace(/^[^?]*\?/, '')
	);
	
	var issn = get_issn(params); 
	var genre = get_genre(params);
	
	// JEJ
	var object_id = params['rft.object_id'];
	var has_sfx_id = (object_id != undefined);

	// MT

	var openURL = self.data('openurl');
	
	var titleNA = '<div class="locpanel-heading online"><h2>Online</h2></div><div class="e-links holdings-unit"><div class="alert alert-no-match">Not available.</div></div>';
	
	var titleA = '<div class="locpanel-heading online"><h2>Online</h2></div><div class="e-links holdings-unit"></div>';

	// MT: note: this originally had an additional </div> at the end of it that I erased
	// might wanna put it back if it accidentally broke something
	var availableDiv = '<div class="alert alert-success-match" role="alert">Available</div>';


    /* only display holdings for things that have an SFX number or ISSN, like
     * articles or journals. (e-books are processed separately, by the gotit
     * service.
     */
    
    if (issn) {
	var url = 'https://www.lib.uchicago.edu/cgi-bin/holdings?code=48976&function=holdings&issns=' + issn + '&callback=?';
    } else if (has_sfx_id) {
	var url = 'https://www.lib.uchicago.edu/cgi-bin/holdings?code=48976&function=holdings&sfx=' + object_id + '&callback=?';
    } else {
	var url = 'https://www.lib.uchicago.edu/cgi-bin/holdings?code=48976&function=holdings&callback=?';
    }
      // raw URL
      var unescaped_openurl = document.URL;
      // URL escaped in a manner suitable for the RESTful service
      var openurl = encodeURIComponent(unescaped_openurl);
      $.ajax({
      cache: true,
      dataType: 'json',
      url: url,
      success: function(data) {
	  // raw URL
	  var unescaped_openurl = document.URL;
	  // URL escaped in a manner suitable for the RESTful service
	  var openurl = encodeURIComponent(unescaped_openurl);
          // "Online" header.
          self.append(titleA);

	/* For articles, be sure SFX can point us directly to an article before
	 * displaying it in this section. For all other item types, be sure the
         * holdings service has provided deduped and complete records. 
         */

        var available = false;
        if (genre == 'article') {
          for (var i = 0; i < data['deduped'].length; i++) {
            var name = data['deduped'][i]['name'];
            var f = get_sfx_form(name);
            if ($(f).length > 0) {
              available = true;
            }
          }
        } else {
          available = (data['deduped'].length > 0 && data['complete'].length > 0);
        }
	  console.log(genre);
        if (available) {
          self.find('.e-links').append('<div class="alert alert-success-match" role="alert">Available</div></div>');
          // deduped links.
          var title = data['title'];
          for (var i = 0; i < data['deduped'].length; i++) {
            var coverageString = get_coverage_string(data['deduped'][i]['coverage']);
            if (data['deduped'][i]['note']) {
              coverageString = coverageString + '<br/>Note: ' + data['deduped'][i]['note'];
            }
            if (data['deduped'][i]['embargo']) {
		var months_dd = data['deduped'][i]['embargo'];
		coverageString = coverageString + '<br>' + toDayMonth(months_dd);
            }
            var url = data['deduped'][i]['url'];
            var name = data['deduped'][i]['name'];
            var f = get_sfx_form(name);
            if ($(f).length > 0) {
              self.find('.e-links').append('<div class="row"><div class="result-title"><a class="holdingslink" href="' + url + '" data-ga-category="online" data-ga-action="click" data-ga-label="' + name + '">' + name + ' <i class="fa fa-arrow-circle-right" aria-hidden="true"></i></a></div>' + coverageString + '</div>');
            }
          }
          self.find('.e-links').append('<div class="row e-list-wrapper"><ul aria-label="Accordion Control for e-resources"><li><input type="checkbox" id="e-list" aria-expanded="false" data-ga-category="online" data-ga-action="pulldown" data-ga-label="View all available e-resources for this title"/><label for="e-list"> View all available e-resources for this title</label><ul class="all-available-elinks"></ul></li></ul></div>');
  
          // complete links.
          for (var i = 0; i < data['complete'].length; i++) {
              var coverageString = get_coverage_string(data['complete'][i]['coverage']);
              if (data['complete'][i]['note']) {
                coverageString = coverageString + '<br/>Note: ' + data['complete'][i]['note'];
              }
              if (data['complete'][i]['embargo']) {
		  var months_dc = data['complete'][i]['embargo'];
                  coverageString = coverageString + '<br>' + toDayMonth(months_dc);
              }
              self.find('.all-available-elinks').append('<li><a href="' + data['complete'][i]['url'] + '" class="holdingslink elink external" data-ga-category="online" data-ga-action="click" data-ga-label="' + data['complete'][i]['name'] + '">' + data['complete'][i]['name'] + '</a><br/>' + coverageString + '</li>');
          }
        } else {
	    // display 'Available' div with icon for Open Access holdings
	    var isAvailable = function () {
		  self.find('.e-links')
		  .append(
		      '<div class="alert alert-success-match" role="alert">Available</div></div>'
		  );
	    };
	    // display 'Not Available' div with icon
	    var notAvailable = function () {
		  self.find('.e-links')
		  .append(
		      '<div class="alert alert-no-match" role="alert">Not available.</div>'
		  );
	    };
	    // display entry for a single open access source
	    var openAccessHTML = function (link, provider, providerLink) {
		var divs = ('<div class="row"><div class="result-title"><a class="holdingslink" href="' + link + '" data-ga-category="online" data-ga-action="click" data-ga-label="Available as Open Access"> Available as Open Access <i class="fa fa-arrow-circle-right" aria-hidden="true"></i></a><br><small>Located via <a href="' + providerLink + '">' + provider + '</a> and <a href="https://openaccessbutton.org/">Open Access Button</a></small></div></div>');
		return divs;
	    };

	    $.ajax({
		cache: true,
		dataType: 'json',
		url:
		('https://lib.uchicago.edu/cgi-bin/openaccess?code=6685&function=openaccess&openurl=' + openurl + '&callback=?'),
		success: function(data) {
		    isAvailable();
		    var displayHoldings = function (lst) {
			for (var i = 0; i < lst.length; i++) {
			    var holding = lst[i];
			    self.find('.e-links').append(openAccessHTML(holding['url'],
									holding['display'],
									holding['displaylink']));
			}
		    };
		    displayHoldings(data)
		},
		error: function (data) {
		    notAvailable();
		}
	    });
	}

        $('a.holdingslink').click(function(e) {
          var holdingslink = $(this);
          var holdingstext = holdingslink.text().replace(/^\s+|\s+$/g, '');
          var f = get_sfx_form(holdingstext);
          if ($(f).length > 0) {
            e.preventDefault();
            $(f).attr('target', '_self');
            $(f).submit();
          }
        });
      }
    });  
  }


    
//   $.fn.holdingssection = function() {
//     var self = this;

//     var params = parse_query_string(
//       self.data('openurl').replace(/^[^?]*\?/, '')
//     );

//     var issn = get_issn(params); 
//     var genre = get_genre(params);

//     // JEJ
//     var object_id = params['rft.object_id'];
//     var has_sfx_id = (object_id != undefined);
   
//     /* only display holdings for things that have an SFX number or ISSN, like
//      * articles or journals. (e-books are processed separately, by the gotit
//      * service.
//      */
//     if (has_sfx_id) { 
//       var url = 'https://www.lib.uchicago.edu/cgi-bin/holdings?code=48976&function=holdings&sfx=' + object_id + '&callback=?';
//     } else if (issn) {
//       var url = 'https://www.lib.uchicago.edu/cgi-bin/holdings?code=48976&function=holdings&issns=' + issn + '&callback=?';
//     } else {
//       self.append('<div class="locpanel-heading online"><h2>Online</h2></div><div class="e-links holdings-unit"><div class="alert alert-no-match">Not available.</div></div>');
//       return;
//     }
//     $.ajax({
//       cache: true,
//       dataType: 'json',
//       url: url,
//       success: function(data) {
//         // "Online" header.
//         self.append('<div class="locpanel-heading online"><h2>Online</h2></div><div class="e-links holdings-unit"></div>');

// 	/* For articles, be sure SFX can point us directly to an article before
// 	 * displaying it in this section. For all other item types, be sure the
//          * holdings service has provided deduped and complete records. 
//          */

//         var available = false;
//         if (genre == 'article') {
//           for (var i = 0; i < data['deduped'].length; i++) {
//             var name = data['deduped'][i]['name'];
//             var f = get_sfx_form(name);
//             if ($(f).length > 0) {
//               available = true;
//             }
//           }
//         } else {
//           available = (data['deduped'].length > 0 && data['complete'].length > 0);
//         }
// console.log(genre);
//         if (available) {
//           self.find('.e-links').append('<div class="alert alert-success-match" role="alert">Available</div></div>');
//           // deduped links.
//           var title = data['title'];
//           for (var i = 0; i < data['deduped'].length; i++) {
//             var coverageString = get_coverage_string(data['deduped'][i]['coverage']);
//             if (data['deduped'][i]['note']) {
//               coverageString = coverageString + '<br/>Note: ' + data['deduped'][i]['note'];
//             }
//             if (data['deduped'][i]['embargo']) {
// 		var months_dd = data['deduped'][i]['embargo'];
// 		coverageString = coverageString + '<br>' + toDayMonth(months_dd);
//             }
//             var url = data['deduped'][i]['url'];
//             var name = data['deduped'][i]['name'];
//             var f = get_sfx_form(name);
//             if ($(f).length > 0) {
//               self.find('.e-links').append('<div class="row"><div class="result-title"><a class="holdingslink" href="' + url + '" data-ga-category="online" data-ga-action="click" data-ga-label="' + name + '">' + name + ' <i class="fa fa-arrow-circle-right" aria-hidden="true"></i></a></div>' + coverageString + '</div>');
//             }
//           }
//           self.find('.e-links').append('<div class="row e-list-wrapper"><ul aria-label="Accordion Control for e-resources"><li><input type="checkbox" id="e-list" aria-expanded="false" data-ga-category="online" data-ga-action="pulldown" data-ga-label="View all available e-resources for this title"/><label for="e-list"> View all available e-resources for this title</label><ul class="all-available-elinks"></ul></li></ul></div>');
  
//           // complete links.
//           for (var i = 0; i < data['complete'].length; i++) {
//               var coverageString = get_coverage_string(data['complete'][i]['coverage']);
//               if (data['complete'][i]['note']) {
//                 coverageString = coverageString + '<br/>Note: ' + data['complete'][i]['note'];
//               }
//               if (data['complete'][i]['embargo']) {
// 		  var months_dc = data['complete'][i]['embargo'];
//                   coverageString = coverageString + '<br>' + toDayMonth(months_dc);
//               }
//               self.find('.all-available-elinks').append('<li><a href="' + data['complete'][i]['url'] + '" class="holdingslink elink external" data-ga-category="online" data-ga-action="click" data-ga-label="' + data['complete'][i]['name'] + '">' + data['complete'][i]['name'] + '</a><br/>' + coverageString + '</li>');
//           }
//         } else {
//           self.find('.e-links').append('<div class="alert alert-no-match" role="alert">Not available.</div>');
//         }

//         $('a.holdingslink').click(function(e) {
//           var holdingslink = $(this);
//           var holdingstext = holdingslink.text().replace(/^\s+|\s+$/g, '');
//           var f = get_sfx_form(holdingstext);
//           if ($(f).length > 0) {
//             e.preventDefault();
//             $(f).attr('target', '_self');
//             $(f).submit();
//           }
//         });
//       }
//     });  
//   }

  $.fn.gotitsection = function() {
    var self = this;

    var gotit_service = 'https://www.lib.uchicago.edu/cgi-bin/gotit';
    var openurl_query_string = self.data('openurl').replace(/^[^?]*\?/, '');
    var params = parse_query_string(openurl_query_string);

    var author       = get_author(params);
    var volume       = get_volume(params);
    var issue        = get_issue(params);
    var pages        = get_page_range(params);
    var aulast       = get_aulast(params);
    var journaltitle = get_journal_title(params);
    var isbn         = get_isbn(params);
    var issn         = get_issn(params);
    var oclc         = get_oclcnum(params);
    var year         = get_year(params);

    var standard_number_type = '';
    if (isbn) {
      standard_number_type = 'ISBN';
    } else if (issn) {
      standard_number_type = 'ISSN';
    } else if (oclc) {
      standard_number_type = 'OCLC';
    }

    var genre = get_genre(params);

    if (genre == 'article') {
      var title = get_article_title(params);
    } else {
      var title = get_title(params);
    }

    if (genre == 'article' || genre == 'journal') {
      var catalog_search_url = 'https://catalog.lib.uchicago.edu/vufind/Search/Results?lookfor=' + encodeURIComponent(journaltitle) + '&amp;type=JournalTitle';
      var human_readable_title_type = 'journal title';
    } else if (genre == 'bookitem') {
      // if the genre is chapter, do an advanced search for the book title
      var catalog_search_url = 'https://catalog.lib.uchicago.edu/vufind/Search/Results?bool0%5B%5D=AND&lookfor0%5B%5D=' + encodeURIComponent(title) + '&type0%5B%5D=Title';
      var human_readable_title_type = 'title';
    } else {
      // if the genre is book, do an advanced search for the title and author.
      var catalog_search_url = 'https://catalog.lib.uchicago.edu/vufind/Search/Results?bool0%5B%5D=AND&lookfor0%5B%5D=' + encodeURIComponent(title) + '&type0%5B%5D=Title&lookfor0%5B%5D=' + encodeURIComponent(aulast) + '&type0%5B%5D=Author';
      var human_readable_title_type = 'title';
    }

    if (isbn) {
      var url = gotit_service + '?code=48976&function=gotit&type=isbn&query=' + encodeURIComponent(isbn) + '&callback=?';
    } else if (issn && volume) {
      var url = gotit_service + '?code=48976&function=gotit&type=openurl&query=' + encodeURIComponent('http://www.example.com?issn=' + issn + '&volume=' + volume) + '&callback=?';
    } else if (issn) {
      var url = gotit_service + '?code=48976&function=gotit&type=issn&query=' + encodeURIComponent(issn) + '&callback=?';
    } else if (oclc) {
      var url = gotit_service + '?code=48976&function=gotit&type=openurl&query=' + encodeURIComponent('http://www.example.com/?oclc=' + oclc) + '&callback=?';
    } else {
      self.append('<div class="locpanel-heading"><h2>In the Library</h2></div>');
      self.append('<div id="e-links" class="holdings-unit"><div class="alert alert-no-match" role="alert">No <strong>standard number</strong> in citation - could not automatically search Library catalog. <div class="resubmit-search"><a href="' + catalog_search_url + '" data-ga-category="in-the-library" data-ga-action="click" data-ga-label="Search the Library catalog by ' + human_readable_title_type + '">Search the Library catalog <strong>by ' + human_readable_title_type + '</strong></a> </div></div></div>');
      return;
    }
    $.ajax({
      cache: true,
      dataType: 'json',
      url: url,
      success: function(data) {
        // save data for later. 
        $('#gotitsection').data('data', data);

        // header
        self.append('<div class="locpanel-heading"><h2>In the Library</h2></div>');

        var match = false;
        for (var i = 0; i < data['result'].length; i++) {
          if (data['result'][i]['status'] == 'available' || data['result'][i]['status'] == 'multivols') {
            if (data['result'][i]['print'].length > 0) {
              match = true;
            }
          }
          if (data['result'][i]['status'] == 'unavailable' && data['result'][i]['reason'] != 'Volume not owned') {
            match = true;
          }
          // if there is something in the locs array, this item has print holdings.
          // this will even work for journals, where the availability message is taking 
          // the specific article into consideration for the print array.
          if (data['result'][i]['locs'].length > 0) { 
            match = true;
          }
        }
        if (match) {
          self.append('<div class="e-links holdings-unit">');
          // there is a match for this...
          if (issn) {
          self.find('.e-links').append('<div class="alert alert-unknown" role="alert">Some volumes found in the Library Catalog</div>');
          } else {
          self.find('.e-links').append('<div class="alert alert-success-match" role="alert">There is a match for this <strong>' + encodeURIComponent(standard_number_type) + '</strong> in the Library Catalog</div>');
          }
          for (var i = 0; i < data['result'].length; i++) {
            if (data['result'][i]['locs'].length == 0) {
              continue;
            }

            var gotit_title = data['result'][i]['title'];

            var availability_text = '';
            var availability_html = '';
            if (data['result'][i]['status'] == 'available') {
              availability_text = 'Available';
              availability_html = '<span class="text-success">' + availability_text + '</span>';
            } else if (data['result'][i]['status'] == 'multivol' || data['result'][i]['status'] == 'nomatch') {
              availability_text = 'See record for availability';
              availability_html = '<span class="text-unknown">' + availability_text + '</span>';
            } else if (data['result'][i]['status'] == 'unavailable') {
              availability_text = 'Not Available';
              availability_html = '<span class="text-danger">' + availability_text + '</span>';
            } 
  
            var call_numbers = [];
            for (var j = 0; j < data['result'][i]['print'].length; j++) {
              call_numbers.push(data['result'][i]['print'][j]['callno']);
            }
            for (var j = 0; j < data['result'][i]['callnos'].length; j++) {
              call_numbers.push(data['result'][i]['callnos'][j]);
            }
            // unique elements
            call_numbers = call_numbers.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
            call_numbers = call_numbers.join(', ');
  
            if (data['result'][i]['locs'].length == 0) {
              locations = '';
            } else if (data['result'][i]['locs'].length == 1) {
              var location_code_chunk = data['result'][i]['locs'][0].split('/').pop();
              if (location_code_chunk) {
                locations = get_human_readable_location(location_code_chunk);
              } else {
                locations = '';
              }
            } else if (data['result'][i]['locs'].length > 1) {
              locations = 'Multiple Locations';
            }
  
            // scan and deliver...
            var sndable = false;
            if (data['result'][i]['status'] == 'multivol' || (data['result'][i]['status'] == 'nomatch' && data['result'][i]['callnos'].length > 0)) {
              sndable = true;
            } else {
              for (var j = 0; j < data['result'][i]['print'].length; j++) {
                if (data['result'][i]['print'][j].sndable == 'eligible' || data['result'][i]['print'][j].sndable == 'punt') {
                  sndable = true;
                }
              }
            }
            if (sndable) {
              if (genre == 'book') {
                var scan_and_deliver_params = '&PhotoJournalTitle='          + encodeURIComponent(title) +
                                              '&PhotoJournalVolume='         + encodeURIComponent(volume) +
                                              '&PhotoJournalYear='           + encodeURIComponent(year) +
                                              '&ISSN='                       + encodeURIComponent(isbn) +
                                              '&PhotoJournalInclusivePages=' + encodeURIComponent(pages) +
                                              '&Location='                   + encodeURIComponent(locations) +
                                              '&CallNumber='                 + encodeURIComponent(call_numbers);
              } else {
                var scan_and_deliver_params = '&PhotoJournalTitle='          + encodeURIComponent(journaltitle) +
                                              '&PhotoJournalVolume='         + encodeURIComponent(volume) +
                                              '&PhotoJournalIssue='          + encodeURIComponent(issue) +
                                              '&ISSN='                       + encodeURIComponent(issn) +
                                              '&PhotoJournalInclusivePages=' + encodeURIComponent(pages) +
                                              '&PhotoArticleTitle='          + encodeURIComponent(title) +
                                              '&Location='                   + encodeURIComponent(locations) +
                                              '&CallNumber='                 + encodeURIComponent(call_numbers);
              }
  
              var scan_and_deliver_link = '<a href="https://requests.lib.uchicago.edu/illiad/illiad.dll?Action=10&Form=20&Value=GenericRequestGargoyleExpress&sid=ScanDeliver&genre=docdel' + scan_and_deliver_params + '" class="service external" data-ga-category="in-the-library" data-ga-action="click" data-ga-label="Scan and Deliver"><i class="fa fa-fw fa-file-text-o" aria-hidden="true"></i> Scan and Deliver</a>';
            } else {
              var scan_and_deliver_link = '';
            }
            var label = availability_text + '|' + locations + '|';
            if (scan_and_deliver_link) {
              label = label + 'Scan and Deliver|';
            }
            label = label + call_numbers;
            self.find('.e-links').append('<div class="row in-library"><div class="result-title"><a href="https://catalog.lib.uchicago.edu/vufind/Record/' + encodeURIComponent(data['result'][i]['bibid']) + '" data-ga-category="in-the-library" data-ga-action="click" data-ga-label="' + label + '">' + gotit_title + ' ' + call_numbers + ' <i class="fa fa-arrow-circle-right" aria-hidden="true"></i></a></div>' + availability_html + '<span class="location">' + locations + '</span>' + scan_and_deliver_link + '</div>');
          }
        // or search the library catalog...
        self.find('.e-links').append('<div class="row"><span class="view-all">OR <a href="' + catalog_search_url + '" data-ga-category="in-the-library" data-ga-action="click" data-ga-label="Search the Library Catalog for works with this ' + human_readable_title_type + '">Search the Library Catalog for works with this <strong>' + human_readable_title_type + '</strong></a></span></div>');
        } else {
          self.append('<div class="e-links holdings-unit"><div class="alert alert-no-match" role="alert"><strong>' + standard_number_type + '</strong> not located in the UChicago Library collection.<div class="resubmit-search"><a href="' + catalog_search_url + '" data-ga-category="in-the-library" data-ga-action="click" data-ga-label="Search the Library catalog by title">Search the Library catalog <strong>by title</strong></a> </div></div></div>');
        }

        // Then, go back back into the "Online" section and add e-holdings, if appropriate. 
        if (genre == 'book' || genre == 'bookitem') {
          $(document).ajaxStop(function() {
            var data = $('#gotitsection').data('data');

            var has_eholdings = false;
            for (var i = 0; i < data['result'].length; i++) {
              if (data['result'][i]['eholdingspresent']) {
                has_eholdings = true;
              }
            }

            if (has_eholdings) {
              var elinks = $('#holdingssectionNew').find('.e-links');
              elinks.empty();
              elinks.append('<div class="alert alert-success-match" role="alert">Available</div>');
    
              for (var i = 0; i < data['result'].length; i++) {
                for (var j = 0; j < data['result'][i]['eholding'].length; j++) {
                  var href = data['result'][i]['eholding'][j]['url'];
                  if (data['result'][i]['eholding'][j]['text'].join('') == '') {
                    var text = href;
                  } else {
                    var text = data['result'][i]['eholding'][j]['text'].join('');
                  }
                  // proxy server links are http as of September 2018
                  elinks.append('<div><a href="http://proxy.uchicago.edu/login?url=' + href + '" data-ga-category="online" data-ga-action="click" data-ga-label="' + text + '">' + text + '</a></div>');
                }
              }
            } else {
              $('#sfxforms').find('.section').each(function() {
                if ($(this).find('h2').text() == 'Find It Online') {
                  var elinks = $('#holdingssection').find('.e-links');
                  elinks.empty();
                  elinks.append('<div class="alert alert-success-match" role="alert">Available</div>');
                  $(this).find('tr').each(function() {
                    var form = $(this).find('form');
                    var text = $(this).find('a').text();
                    var a = $('<a href="#" data-ga-category="online" data-ga-action="click" data-ga-label="' + text + '">' + text + '</a>');
                    var div = $('<div></div>');
                    elinks.append(div);
                    div.append(a);
                    a.click(function() {
                      form.submit();
                    });
                  });
                }
              });
            }
          });
        }
      }
    });  
  }

  $.fn.otherlibrarieslink = function() {
    var self = this;

    var openurl = $('#sfx_openurl').text();
    var openurl_query_string = openurl.replace(/^[^?]*\?/, '');
    var params = parse_query_string(openurl_query_string);

    var genre = get_genre(params);
    var jtitle = get_journal_title(params);
    if (genre == 'bookitem') {
      jtitle = get_title(params);
    }
    if (genre == 'bookitem' || genre == 'journal') {
      genre = 'article';
    }

    var requests_params = {
      'genre':             genre,
      'rft.jtitle':        jtitle,
      'rft.volume':        get_volume(params),
      'rft.issue':         get_issue(params),
      'PhotoJournalMonth': get_month(params),
      'PhotoJournalYear':  get_year(params),
      'rft.date':          get_year(params),
      'rft.issn':          get_issn(params),
      'rft.title':         get_title(params),
      'rft.atitle':        get_article_title(params)
    };

    var aufirst = get_aufirst(params);
    if (aufirst) {
      requests_params['aufirst'] = aufirst;
    }

    var aulast = get_aulast(params);
    if (aulast) {
      requests_params['aulast'] = aulast;
    }

    var spage = get_spage(params);
    if (spage) {
      requests_params['spage'] = spage;
    }

    var epage = get_epage(params);
    if (epage) {
      requests_params['epage'] = epage;
    }

    var param_arr = [];
    for (var key in requests_params) {
      if (requests_params.hasOwnProperty(key)) {
        param_arr.push(key + '=' + encodeURIComponent(requests_params[key]));
      }
    }

    var base_url = 'https://requests.lib.uchicago.edu/illiad/illiad.dll/openurl?';
    var url = base_url + '&' + param_arr.join('&');
    self.attr('href', url);
  }

  $(document).ready(function() {
    var params = parse_query_string($('#sfx_openurl').text().replace(/^[^?]*\?/, ''));

    var url = 'https://sfx.lib.uchicago.edu/sfx_local/cgi/public/feedback.cgi?em=sfx%40lib.uchicago.edu';

    var sid = get_sid(params);
    if (sid) {
      url = url + '&sid=' + encodeURIComponent(sid);
    }

    var bookt = get_title(params);
    if (bookt) {
      url = url + '&bookt=' + encodeURIComponent(bookt);
    }

    var isbn = get_isbn(params);
    if (isbn) {
      url = url + '&isbn=' + encodeURIComponent(isbn);
    }

    var journal = get_journal_title(params);
    if (journal) {
      url = url + '&journal=' + encodeURIComponent(journal);
    }

    var issn = get_issn(params);
    if (issn) {
      url = url + '&issn=' + encodeURIComponent(issn);
    }
 
    url = url + '&openurl=' + encodeURIComponent($('#sfx_openurl').text());
    // url = url + '&' + $('#sfx_openurl').text().replace(/^[^?]*\?/, '');
    $('#reportaproblem').attr('href', url);
  });

  $(document).on('ajaxStop.ga', function() {
    if ($('a.navbar-brand').attr('data-ga-tracked') == 'on') {
      $(document).off('ajaxStop.ga');
      return;
    }
    var q = 'https://www.lib.uchicago.edu/cgi-bin/subnetclass?jsoncallback=?';
    $.getJSON(q, function(data) {
      gtag('event', 'Subnetclass_dimension', {'Subnetclass': 12});
    });

    if (typeof $('body').track === 'function') {
      $('body').track();
    }
  });
})(jQuery);
