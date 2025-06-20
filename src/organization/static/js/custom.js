$(document).ready(function () {
    const $summernote = $('.summernote');
    const $select2 = $('.select2');
    const $select2Multi = $('.select2-multiple');
    const $fromDate = $('#fromDate');
    const $toDate = $('#toDate');
    const $fromTime = $('#fromTime');
    const $toTime = $('#toTime');
    const $dateMultiple = $('#datepicker-multiple');
    const $dateTimePicker = $('#date-time-picker');
    const $dropZoneUpload = $('.dropZoneUpload');

    const requester = (url, data = {}, type = 'POST', dataType = 'json', msgElem = '.apiMessage') => {
        const $apiMessage = $(msgElem);
        return new Promise(resolve => {
            $.ajax({
                url,
                type,
                data,
                dataType,
                success: function(res) {
                    const { success, message } = res;
                    if (success) {
                        $apiMessage.html(`<div class="alert alert-success alert-dismissible fade show" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>${message}</div>`).parents('div.row').show();
                    } else {
                        $apiMessage.html(`<div class="alert alert-danger alert-dismissible fade show" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>${message}</div>`).parents('div.row').show();
                    }
                    if (msgElem === '.apiMessage') {
                        $('html, body').animate({
                            scrollTop: $apiMessage.offset().top - 100
                        }, 200);
                    }
                    resolve(success);
                },
                error: function(res){
                    $apiMessage.html(`<div class="alert alert-danger alert-dismissible fade show" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>${res.responseJSON.message}</div>`).parents('div.row').show();
                    if (msgElem === '.apiMessage') {
                        $('html, body').animate({
                            scrollTop: $apiMessage.offset().top - 100
                        }, 200);
                    }
                    resolve(false);
                }
            });
        });
    };

    $summernote.each((i, elem) => {
        const $this = $(elem);
        $this.summernote({
            height: 250,
            minHeight: null,
            maxHeight: null,
            focus: !1,
            toolbar: [
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['font', ['strikethrough', 'superscript', 'subscript']],
                ['fontsize', ['fontsize']],
                ['color', ['color']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['height', ['height']],
                ['insert', ['link', 'hr']],
                ['misc', ['undo', 'redo', 'fullscreen', 'codeview']]
            ],
            callbacks: {
                onChange: () => {
                    if($this.summernote('isEmpty')) {
                        $this.siblings('.text-danger').css('display', 'block');
                    }else{
                        $this.siblings('.text-danger').css('display', 'none');
                    }
                }
            }
        });
    });

    function formatState (opt) {
        if (!opt.id) {
            return opt.text.toUpperCase();
        }

        const optImage = $(opt.element).attr('data-image');
        if(optImage){
            return $(`<span><img src="${optImage}" width="30px" />${opt.text.toUpperCase()}</span>`);
        }
        const optIcon = $(opt.element).attr('data-icon');
        if(optIcon){
            return $(`<span><i class="${optIcon} mr-2"></i>${opt.text.toUpperCase()}</span>`);
        }

        return opt.text.toUpperCase();
    }

    $select2.each((i, elem) => {
        const $this = $(elem);
        $this.select2({
            templateResult: formatState,
            templateSelection: formatState,
            placeholder: ($this.attr('data-placeholder') || '').toUpperCase()
        });
        $this.on('change', (e) => {
            if (e.target.value) {
                $this.siblings('.text-danger').css('display', 'none');
            }else{
                $this.siblings('.text-danger').css('display', 'block');
            }
        });
    });

    $select2Multi.each((i, elem) => {
        const $this = $(elem);
        $this.select2({
            templateResult: formatState,
            templateSelection: formatState,
            placeholder: ($this.attr('data-placeholder') || '').toUpperCase()
        });
        $this.on('change', (e) => {
            if (e.target.value) {
                $this.siblings('.text-danger').css('display', 'none');
            }else{
                $this.siblings('.text-danger').css('display', 'block');
            }
        });
    });

    $fromDate.flatpickr({
        enableTime:true,
        defaultDate: $fromDate.attr('data-selected') ? new Date($fromDate.attr('data-selected')) : '',
        minDate: new Date(),
    });

    if($toDate.attr('data-selected')){
        $toDate.flatpickr({
            enableTime:true,
            defaultDate: $toDate.attr('data-selected') ? new Date($toDate.attr('data-selected')) : '',
            minDate: $fromDate.attr('data-selected') ? new Date($fromDate.attr('data-selected')) : '',
        });
    }
  

    $fromDate.on('change', () => {
        if ($toDate.length) {
            $toDate.removeAttr('readonly').val('');
            $toDate.flatpickr({
                minDate: $fromDate.val(),
                enableTime:true
            });
        }
    });

    $fromTime.flatpickr({
        noCalendar: true,
        enableTime: true,
        time_24hr: true,
        dateFormat: "H:i",
        autoClose:true
    });

    $fromTime.on('change', () => {
        if ($toTime.length) {
            $toTime.removeAttr('readonly').val('');
            $toTime.flatpickr({
                noCalendar: true,
                enableTime: true,
                time_24hr: true,
                dateFormat: "H:i",
                autoClose:true,
                minTime: $fromTime.val(),
            });
        }
    });
   

    $('#range-datepicker').flatpickr({
        mode: 'range',
        maxDate: new Date(),
    });

    $dateMultiple.flatpickr({
        mode:"multiple",
        conjunction:" , ",
        defaultDate: $dateMultiple.attr('data-selected') ? $dateMultiple.attr('data-selected').split(',') : []
    });

    const dateTimePicker = $dateTimePicker.flatpickr({
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        minDate: new Date()
    });
    $dateTimePicker.attr('data-selected') && dateTimePicker.setDate(new Date($dateTimePicker.attr('data-selected')), true, "Y-m-d H:i");

    $('.niceSelect').niceSelect();
  
    $dropZoneUpload.each((i, elem) => {
        const $this = $(elem);
        const uploadedObjects = $this.attr('data-uploaded') ? JSON.parse($this.attr('data-uploaded')) : {};
        const maxFiles = !isNaN(parseInt($this.attr('data-maxFiles'))) ? parseInt($this.attr('data-maxFiles')) : 1;
        const removeClass = $this.attr('data-removeClass') || '';
        const $thisRes = $(`#${$this.attr('data-saveTo')}`);
        
        $this.dropzone({
            paramName: $this.attr('data-paramName') || 'file',
            url: `${$this.attr('data-url')}`,
            uploadMultiple: $this.attr('data-maxFiles') > 1,
            maxFiles,
            maxFilesize: !isNaN(parseInt($this.attr('data-maxFilesize'))) ? parseInt($this.attr('data-maxFilesize')) : 2,
            acceptedFiles: $this.attr('data-acceptedFiles') || 'image/*',
            parallelUploads: 1,
            addRemoveLinks: true,
            dictRemoveFile: '<i class="fas fa-trash text-danger"></i>',
            init: function () {
                const addFiles = (mockFile) => {
                    this.emit("addedfile", mockFile);
                    this.emit('thumbnail', mockFile, mockFile.thumb);
                    mockFile.previewElement.classList.add('dz-success');
                    mockFile.previewElement.classList.add('uploadedImg');
                    mockFile.previewElement.classList.add('dz-complete');
                    this.emit("complete", mockFile);
                    if (mockFile.type === 'video/mp4') {
                        $(mockFile.previewElement).find('.dz-image').empty().html(`<video src="${mockFile.thumb}" />`);
                    }
                    this.options.maxFiles > 0 && (this.options.maxFiles = this.options.maxFiles - 1);
                    $this.children().last().find('.dz-remove').attr('href', 'javascript: void(0);').addClass(removeClass)
                };

                this.on("success", function(file, responseText) {
                    if (responseText.success) {
                        $this.siblings('.text-danger').hide();
                        $this.children('.needsclick').hide();
                        let urls = `${$thisRes.val()}${responseText.data},`.split(',');
                        urls = urls.filter((item, i, ar) => ar.indexOf(item) === i).join(',');
                        $thisRes.val(urls);
                        const tempUrlArr = urls.split(',').filter(i => i);
                        file.key = tempUrlArr[tempUrlArr.length - 1];
                        file.thumb = `${window.wtp.s3Base}${tempUrlArr[tempUrlArr.length - 1]}`;
                    }
                });

                this.on("removedfile", async file => {
                    $this.children('.needsclick').hide();
                    if (file.key) {
                        const uploadedFile = $thisRes.val().split(',');
                        const url = uploadedObjects.url || '/utils/delete-file';
                        const data = {
                            ...uploadedObjects.data,
                            key: file.key,
                        };
                        const result = await requester(url, data, uploadedObjects.type, uploadedObjects.dataType, $this.children('[data-msg-id]').attr('data-msg-id'));

                        if (result) {
                            const $thisRes = $(`#${$this.attr('data-saveTo')}`);
                            let urls = $thisRes.val().split(',').filter(i => i);
                            delete urls[urls.indexOf(file.key)];
                            urls = urls.filter(i => i).join(',');
                            $thisRes.val(urls ? `${urls},` : '');
                            $this.children('.dz-preview').length < maxFiles && (this.options.maxFiles = this.options.maxFiles + 1);
                        } else {
                            addFiles(file);
                        }
                        if(!$this.children('.dz-preview').length) {
                            $this.children('.needsclick').show();
                            $this.siblings('.text-danger').show();
                        }
                        if(result && uploadedFile){
                            const index = uploadedFile.indexOf(file.key);
                            if(index !== -1){
                                uploadedFile.splice(index, 1);  
                                $thisRes.val(uploadedFile);                
                            }
                        }
                    }
                    else if(!file.key && !$this.children('.dz-preview').length) {
                            $this.children('.needsclick').show();
                            $this.siblings('.text-danger').show();
                        }
                });

                uploadedObjects.objects && uploadedObjects.objects.forEach(mockFile => addFiles(mockFile));
            }
        });
    });
});

$(document).on('click', '.deleteItem, .statusChange, .cancelSubscription, .resetPlan', function (e) {
    e.preventDefault();
    const url = $(this).attr('href');
    Swal.fire({
        title: 'Are you sure?',
        type: 'warning',
        showCancelButton: !0,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes!'
    }).then(function (t) {
        t.value && (window.location.href = url);
    });
});

$('input.form-control').change(function() {
    $(this).val($(this).val().trim());
});


function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}