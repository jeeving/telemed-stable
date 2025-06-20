$(document).ready(() => {

    const $appointementTwilioTable = $('#appointments-twilio-datatable');

    $('#report-user-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-3, -4]
            }
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: `/report/report-list/${$('#report-user-datatable').data('id')}`,
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#report-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-3, -4]
            }
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/report/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#users-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-3, -4]
            }
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/users/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#pages-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1]
            }
        ],
        stateSave: true,
        searching: false,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/pages/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#social-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1]
            }
        ],
        stateSave: true,
        searching: false,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/social_links/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#faq-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1]
            }
        ],
        stateSave: true,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/faqs/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#speciality-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/speciality/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#advertisements-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/advertisements/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#appointments-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        dom: 'Bfltip',
        buttons: [
            {
                extend: 'csv',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10],
                }

            },
            {
                extend: 'excel',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10],

                }
            },
            // {
            //     extend: 'pdf',
            //    exportOptions: {
            //         columns: ':visible'
            //     }
            // },
            {
                extend: 'print',
                exportOptions: {
                    columns: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10],
                }
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,

        ajax: {
            url: '/appointments/list',
            data: {}
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#payments-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        dom: 'Bfltip',
        buttons: [
            {
                extend: 'csv',
                exportOptions: {
                    columns: ':visible'
                }
            },
            {
                extend: 'excel',
                exportOptions: {
                    columns: ':visible'
                }
            },
            // {
            //     extend: 'pdf',
            //    exportOptions: {
            //         columns: ':visible'
            //     }
            // },
            {
                extend: 'print',
                exportOptions: {
                    columns: ':visible'
                }
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/payments/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#payments-request-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        dom: 'Bfltip',
        buttons: [
            {
                extend: 'csv',
                exportOptions: {
                    columns: ':visible'
                }
            },
            {
                extend: 'excel',
                exportOptions: {
                    columns: ':visible'
                }
            },
            // {
            //     extend: 'pdf',
            //    exportOptions: {
            //         columns: ':visible'
            //     }
            // },
            {
                extend: 'print',
                exportOptions: {
                    columns: ':visible'
                }
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/payments/payment-request-list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });
    

    $('#searchByStatus').change(function () {
        console.log($('#searchByStatus').val())
        let status = $('#searchByStatus').val()
        let table = $('#appointments-datatable').DataTable();
        table.ajax.url("/appointments/list?status=" + status).load();
    });

    $('#paymentsByStatus').change(function () {
        console.log($('#paymentsByStatus').val())
        let status = $('#paymentsByStatus').val()
        let table = $('#payments-datatable').DataTable();
        table.ajax.url("/payments/list?status=" + status).load();
    });

    $('#paymentsRequestByStatus').change(function () {
        console.log($('#paymentsRequestByStatus').val())
        let status = $('#paymentsRequestByStatus').val()
        let table = $('#payments-request-datatable').DataTable();
        table.ajax.url("/payments/payment-request-list?status=" + status).load();
    });

    $('#accountUpdate-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-3, -4]
            }
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/accountUpdate/list',
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    });

    $('#appointments-twilio-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-3, -4]
            }
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: `/appointments/callTwilioList/${$appointementTwilioTable.attr('data-aid')}`,
            data: {}
        },
        initComplete: (settings, json) => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">'
            }
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        }
    })

    $('#country-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/country/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#state-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/state/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#searchByCountry').change(function () {
        console.log($('#searchByCountry').val())
        let country = $('#searchByCountry').val()
        let table = $('#state-datatable').DataTable();
        table.ajax.url("/state/list?countryId=" + country).load();
    });

    $('#becomeverified-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        searching: false,
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: '/becomeverified/list',
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

    $('#searchByStatus').change(function () {
        console.log($('#searchByStatus').val())
        let status = $('#searchByStatus').val()
        let table = $('#becomeverified-datatable').DataTable();
        table.ajax.url("/becomeverified/list?status=" + status).load();
    });

    $('#topuphistory-datatable').DataTable({
        aoColumnDefs: [
            {
                bSortable: false,
                aTargets: [-1],
            },
        ],
        searching: false,
        stateSave: true,
        searchDelay: 700,
        aaSorting: [[0, 'desc']],
        processing: true,
        serverSide: true,
        ajax: {
            url: `/transactions/list?userId=${$('#topuphistory-datatable').attr('userId')}`,
            data: {},
        },
        initComplete: () => {
            $('.tableLoader').css('display', 'none');
        },
        language: {
            paginate: {
                previous: '<i class="mdi mdi-chevron-left">',
                next: '<i class="mdi mdi-chevron-right">',
            },
        },
        drawCallback: () => {
            $('.dataTables_paginate > .pagination').addClass('pagination-rounded');
        },
    });

});