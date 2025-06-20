
$(document).ready(function () {
    $('#screenshortslider').owlCarousel({
        loop: false,
        margin: 30,
        nav: true,
        autoplay: false,
        animateOut: 'slideOutDown',
        animateIn: 'flipInX',
        stagePadding: 30,
        smartSpeed: 2500,
        mouseDrag: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 3
            },
            1000: {
                items: 4
            }
        }
    })

    $(window).scroll(function () {
        if ($(window).scrollTop() >= 1) {
            $('header').addClass('header-scrolled');
        }
        else {
            $('header').removeClass('header-scrolled');
        }
    });

    $("#mobile-nav-toggle").click(function () {
        $('body').addClass('mobile-nav-active');
        $('#mobile-body-overly').css("display", "block");
    });
    $("#mobile-body-overly").click(function () {
        $('body').removeClass('mobile-nav-active');
        $('#mobile-body-overly').css("display", "none");
    });

    /* modal js */
    $(".whyUs,.contactUs").click(function () {
        $('body').removeClass('mobile-nav-active');
        $('#mobile-body-overly').css("display", "none");
    });

    // $(".termandcondition").click(function(){
    //     $('body,html').addClass('modal-open');
    //     $('#termandcondition').show();
    //     $('#privacypolicy').hide();
    //     $('#aboutus').hide();
    //     $('#mobile-body-overly').css("display", "block");
    // });
    // $(".privacypolicy").click(function(){
    //     $('body,html').addClass('modal-open');
    //     $('#privacypolicy').show();
    //     $('#aboutus').hide();
    //     $('#termandcondition').hide();
    //     $('#mobile-body-overly').css("display", "block");
    // });
    // $(".aboutus").click(function(){
    //     $('body,html').addClass('modal-open');
    //     $('#aboutus').css("display", "block");
    //     $('#privacypolicy').hide();
    //     $('#termandcondition').hide();
    //     $('#mobile-body-overly').css("display", "block");
    // });
    $(".modal .close").click(function () {
        $('body,html').removeClass('modal-open');
        $('body').removeClass('mobile-nav-active');
        $('#mobile-body-overly').css("display", "none");
        $('#privacypolicy').hide();
        $('#termandcondition').hide();
        $('#aboutus').hide();
        $('.scroll_dowo.active').removeClass('active');
    });

});


$(document).ready(function () {
    //prevent the default action for the click event
    var is_first = true;
    $('#header ul li a').click(function (event) {
        var buffer_margin = 0;

        if (is_first) {
            buffer_margin = 0;
            is_first = false;
        }
        else {
            buffer_margin = 100;
        }
        console.log(buffer_margin);
        //event.preventDefault();
        //get the full url - like mysitecom/index.htm#home
        var full_url = this.href;

        //split the url by # and get the anchor target name - home in mysitecom/index.htm#home
        var parts = full_url.split("#");

        var trgt = parts[1];
        //get the top offset of the target anchor
        var target_offset = $("#" + trgt).offset();
        if (target_offset !== 'undefined' && $.trim(target_offset) !== '') {
            var top_margin = $('header').height() + buffer_margin;
            var target_top = target_offset.top - top_margin;

            //goto that anchor by setting the body scroll top to anchor top
            $('html, body').animate({ scrollTop: target_top }, 1500);
            //   $('#header').addClass('header-scrolled');
        }

    });
});

