/* dot nav */
jQuery(window).bind('scroll',function(e){
  redrawDotNav();
});

function redrawDotNav(){
  
  	var topNavHeight = 300;
  	var numDivs = jQuery('section').length;
	
  	jQuery('#dotNav li a').removeClass('active').parent('li').removeClass('active');  	
  	jQuery('section').each(function(i,item){
      var ele = jQuery(item), nextTop;
      
      console.log(ele.next().html());
	  
      
      if (typeof ele.next().offset() != "undefined") {
        nextTop = ele.next().offset().top;
		
      }
      else {
        nextTop = jQuery(document).height();
      }
      
      if (ele.offset() !== null) {
        thisTop = ele.offset().top - ((nextTop - ele.offset().top) / numDivs);
		
      }
      else {
        thisTop = 0;
      }
      
      var docTop = jQuery(document).scrollTop()+topNavHeight;
      
      if(docTop >= thisTop && (docTop < nextTop)){
        jQuery('#dotNav li').eq(i).addClass('active');
		
      }
	});   
}

/* get clicks working */
jQuery('#dotNav li').click(function($){
  
	var id = $(this).find('a').attr("href"),
      posi,
      ele,
      padding = $('.navbar-fixed-top').height();
  
	ele = $(id);
	posi = ($(ele).offset()||0).top - padding;
  
	$('html, body').animate({scrollTop:posi}, 'slow');
  
	return false;
});
/* end dot nav */



(function($) {

  /**
    * Originally written by Sam Sehnert
   */

  $.fn.visible = function(partial) {
    
      var $t            = $(this),
          $w            = $(window),
          viewTop       = $w.scrollTop(),
          viewBottom    = viewTop + $w.height(),
          _top          = $t.offset().top,
          _bottom       = _top + $t.height(),
          compareTop    = partial === true ? _bottom : _top,
          compareBottom = partial === true ? _top : _bottom;
    
    return ((compareTop >= viewTop) && (compareBottom <= viewBottom));

  };
    
})(jQuery);

jQuery(document).ready(function() {
jQuery(".mainsec h1").addClass("animated fadeInUp");
jQuery(".mainsec h2").addClass("animated fadeInUp");	
jQuery(".mainsec p").addClass("animated fadeInUp");	
jQuery(".choose-category").addClass("animated fadeInUp"); 
}); 

jQuery(window).scroll(function(event) {
  
/*Comman all Page*/
jQuery("section").each(function(i, el) {
	var el = jQuery(el);
    if (el.visible(true)) {
      el.addClass("selected"); 
    } 
	else {
      el.removeClass("selected"); 
    } 
  });  
});   
  

/* Check X-large screens and cover the header to full size */
jQuery( document ).ready(function(jQuery) {
if (jQuery( window ).height() > 800 )
{
jQuerysize =  jQuery( window ).height() + "px";
jQuery('.header').css( "height", jQuerysize );
}

});



