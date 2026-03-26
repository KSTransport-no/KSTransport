const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KS Transport API',
      version: '1.0.0',
      description: 'Backend API for KS Transport — tidregistrering, avvik, oppdrag og administrasjon for sjåfører.',
    },
    servers: [
      { url: '/api', description: 'API base path' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            feil: { type: 'string' },
          },
        },
        Sjåfør: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            navn: { type: 'string' },
            epost: { type: 'string', format: 'email' },
            telefon: { type: 'string' },
            aktiv: { type: 'boolean' },
            admin: { type: 'boolean' },
          },
        },
        Skift: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sjåfør_id: { type: 'integer' },
            bil_id: { type: 'integer' },
            sone_id: { type: 'integer' },
            sone: { type: 'string' },
            dato: { type: 'string', format: 'date' },
            start_tid: { type: 'string', format: 'date-time' },
            slutt_tid: { type: 'string', format: 'date-time', nullable: true },
            pause_minutter: { type: 'integer' },
            antall_sendinger: { type: 'integer' },
            vekt: { type: 'integer' },
            kommentarer: { type: 'string' },
            registrering_type: { type: 'string', enum: ['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn'] },
            bomtur_venting: { type: 'string', nullable: true },
            sga_kode_id: { type: 'integer', nullable: true },
            sga_kode_annet: { type: 'string', nullable: true },
            godkjent: { type: 'boolean' },
            godkjent_av: { type: 'integer', nullable: true },
            godkjent_dato: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Avvik: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sjåfør_id: { type: 'integer' },
            type: { type: 'string' },
            beskrivelse: { type: 'string' },
            status: { type: 'string', enum: ['ny', 'under_behandling', 'løst', 'avvist'] },
            admin_kommentar: { type: 'string', nullable: true },
            dato: { type: 'string', format: 'date' },
            bilder: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, bilde_url: { type: 'string' } } } },
          },
        },
        Forbedringsforslag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sjåfør_id: { type: 'integer' },
            tittel: { type: 'string' },
            beskrivelse: { type: 'string' },
            status: { type: 'string', enum: ['ny', 'under behandling', 'besvart'] },
            admin_kommentar: { type: 'string', nullable: true },
          },
        },
        Bil: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            registreringsnummer: { type: 'string' },
            merke: { type: 'string' },
            modell: { type: 'string' },
            årsmodell: { type: 'integer' },
            aktiv: { type: 'boolean' },
          },
        },
        Sone: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            navn: { type: 'string' },
            beskrivelse: { type: 'string' },
            aktiv: { type: 'boolean' },
          },
        },
        Varsling: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            mottaker_id: { type: 'integer' },
            type: { type: 'string' },
            tittel: { type: 'string' },
            melding: { type: 'string' },
            lenke: { type: 'string', nullable: true },
            lest: { type: 'boolean' },
            opprettet: { type: 'string', format: 'date-time' },
          },
        },
        InfoKort: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            kategori: { type: 'string', enum: ['telefon', 'kode'] },
            navn: { type: 'string' },
            verdi: { type: 'string' },
            beskrivelse: { type: 'string', nullable: true },
            aktiv: { type: 'boolean' },
          },
        },
        Oppdrag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            fra: { type: 'string' },
            til: { type: 'string' },
            vekt: { type: 'integer' },
            volum: { type: 'number' },
            kommentar: { type: 'string', nullable: true },
          },
        },
        SgaKode: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            kode: { type: 'string' },
            beskrivelse: { type: 'string' },
            skal_faktureres: { type: 'boolean' },
            aktiv: { type: 'boolean' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autentisering og passord' },
      { name: 'Skift', description: 'Tidregistrering / skift' },
      { name: 'Avvik', description: 'Avviksrapportering' },
      { name: 'Forbedringsforslag', description: 'Forbedringsforslag' },
      { name: 'Data', description: 'Referansedata og tidregistrering' },
      { name: 'Admin', description: 'Administrasjon (krever admin-rolle)' },
      { name: 'CRUD', description: 'Full CRUD for admin-ressurser' },
      { name: 'Upload', description: 'Filopplasting' },
      { name: 'Info', description: 'Telefonnumre og koder' },
      { name: 'Trafikk', description: 'Trafikkdata (TomTom)' },
      { name: 'Vær', description: 'Værdata (Yr.no)' },
      { name: 'Varslinger', description: 'Varsler og notifikasjoner' },
    ],
    paths: {
      // ─── Auth ───
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Logg inn', operationId: 'login',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['epost', 'passord'], properties: { epost: { type: 'string', format: 'email' }, passord: { type: 'string', minLength: 6 } } } } } },
          responses: { 200: { description: 'JWT token + brukerinfo' }, 401: { description: 'Ugyldig innlogging' }, 429: { description: 'For mange forsøk' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'], summary: 'Hent innlogget bruker', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Brukerinfo', content: { 'application/json': { schema: { type: 'object', properties: { sjåfør: { $ref: '#/components/schemas/Sjåfør' } } } } } } },
        },
      },
      '/auth/endre-passord': {
        put: {
          tags: ['Auth'], summary: 'Endre passord', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nåværendePassord', 'nyttPassord'], properties: { nåværendePassord: { type: 'string', minLength: 6 }, nyttPassord: { type: 'string', minLength: 6 } } } } } },
          responses: { 200: { description: 'Passord endret' }, 401: { description: 'Feil passord' } },
        },
      },
      '/auth/profile': {
        put: {
          tags: ['Auth'], summary: 'Oppdater profil', security: [{ bearerAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { navn: { type: 'string' }, epost: { type: 'string', format: 'email' }, telefon: { type: 'string' } } } } } },
          responses: { 200: { description: 'Profil oppdatert' } },
        },
      },
      '/auth/glemt-passord': {
        post: {
          tags: ['Auth'], summary: 'Be om passordtilbakestilling', operationId: 'requestPasswordReset',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['epost'], properties: { epost: { type: 'string', format: 'email' } } } } } },
          responses: { 200: { description: 'E-post sendt (alltid 200 for å hindre e-postenumerering)' } },
        },
      },
      '/auth/tilbakestill-passord': {
        post: {
          tags: ['Auth'], summary: 'Tilbakestill passord med token', operationId: 'resetPassword',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'nyttPassord'], properties: { token: { type: 'string', minLength: 64, maxLength: 64 }, nyttPassord: { type: 'string', minLength: 6 } } } } } },
          responses: { 200: { description: 'Passord tilbakestilt' }, 400: { description: 'Ugyldig eller utløpt token' } },
        },
      },

      // ─── Skift ───
      '/skift': {
        get: {
          tags: ['Skift'], summary: 'Hent skift for innlogget bruker', security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'dato', schema: { type: 'string', format: 'date' } },
            { in: 'query', name: 'måned', schema: { type: 'integer' } },
            { in: 'query', name: 'år', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Liste over skift', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Skift' } } } } } },
        },
        post: {
          tags: ['Skift'], summary: 'Opprett nytt skift', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['bil_id', 'sone_id', 'dato', 'start_tid'], properties: { bil_id: { type: 'integer' }, sone_id: { type: 'integer' }, dato: { type: 'string', format: 'date' }, start_tid: { type: 'string', format: 'date-time' }, slutt_tid: { type: 'string', format: 'date-time' }, pause_minutter: { type: 'integer' }, antall_sendinger: { type: 'integer' }, kommentarer: { type: 'string', maxLength: 1000 } } } } } },
          responses: { 201: { description: 'Skift opprettet' } },
        },
      },
      '/skift/active': {
        get: {
          tags: ['Skift'], summary: 'Hent aktivt skift', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Aktivt skift eller null' } },
        },
      },
      '/skift/{id}': {
        get: {
          tags: ['Skift'], summary: 'Hent skift etter ID', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Skift' }, 404: { description: 'Ikke funnet' } },
        },
        put: {
          tags: ['Skift'], summary: 'Oppdater skift', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { bil_id: { type: 'integer' }, sone_id: { type: 'integer' }, dato: { type: 'string' }, start_tid: { type: 'string' }, slutt_tid: { type: 'string' }, pause_minutter: { type: 'integer' }, antall_sendinger: { type: 'integer' }, vekt: { type: 'integer' }, kommentarer: { type: 'string' } } } } } },
          responses: { 200: { description: 'Oppdatert' }, 403: { description: 'Allerede godkjent' } },
        },
        delete: {
          tags: ['Skift'], summary: 'Slett skift', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Slettet' } },
        },
      },
      '/skift/{id}/slutt': {
        put: {
          tags: ['Skift'], summary: 'Avslutt skift', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['slutt_tid'], properties: { slutt_tid: { type: 'string', format: 'date-time' }, pause_minutter: { type: 'integer' }, antall_sendinger: { type: 'integer' }, kommentarer: { type: 'string' } } } } } },
          responses: { 200: { description: 'Skift avsluttet' } },
        },
      },

      // ─── Avvik ───
      '/avvik': {
        get: {
          tags: ['Avvik'], summary: 'Hent avvik', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste over avvik', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Avvik' } } } } } },
        },
        post: {
          tags: ['Avvik'], summary: 'Opprett avvik', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['type', 'beskrivelse'], properties: { type: { type: 'string', maxLength: 100 }, beskrivelse: { type: 'string', maxLength: 1000 }, skift_id: { type: 'integer' }, bilder: { type: 'array', items: { type: 'object' } } } } } } },
          responses: { 201: { description: 'Avvik opprettet' } },
        },
      },
      '/avvik/{id}': {
        get: {
          tags: ['Avvik'], summary: 'Hent avvik etter ID', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Avvik' } },
        },
        put: {
          tags: ['Avvik'], summary: 'Oppdater avvik', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { type: { type: 'string' }, beskrivelse: { type: 'string' } } } } } },
          responses: { 200: { description: 'Oppdatert' }, 403: { description: 'Ikke tillatt (status != ny)' } },
        },
      },
      '/avvik/{id}/kommentarer': {
        get: {
          tags: ['Avvik'], summary: 'Hent kommentarer for avvik', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Kommentarer' } },
        },
        post: {
          tags: ['Avvik'], summary: 'Legg til kommentar', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kommentar'], properties: { kommentar: { type: 'string', maxLength: 1000 } } } } } },
          responses: { 201: { description: 'Kommentar lagt til' } },
        },
      },

      // ─── Forbedringsforslag ───
      '/forbedringsforslag': {
        get: {
          tags: ['Forbedringsforslag'], summary: 'Hent forbedringsforslag', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste' } },
        },
        post: {
          tags: ['Forbedringsforslag'], summary: 'Opprett forbedringsforslag', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tittel', 'beskrivelse'], properties: { tittel: { type: 'string', maxLength: 200 }, beskrivelse: { type: 'string', maxLength: 2000 } } } } } },
          responses: { 201: { description: 'Opprettet' } },
        },
      },
      '/forbedringsforslag/{id}': {
        get: {
          tags: ['Forbedringsforslag'], summary: 'Hent forbedringsforslag etter ID', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Forbedringsforslag' } },
        },
        put: {
          tags: ['Forbedringsforslag'], summary: 'Oppdater forbedringsforslag', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { tittel: { type: 'string' }, beskrivelse: { type: 'string' } } } } } },
          responses: { 200: { description: 'Oppdatert' } },
        },
        delete: {
          tags: ['Forbedringsforslag'], summary: 'Slett forbedringsforslag', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Slettet' } },
        },
      },
      '/forbedringsforslag/{id}/kommentarer': {
        get: {
          tags: ['Forbedringsforslag'], summary: 'Hent kommentarer', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Kommentarer' } },
        },
        post: {
          tags: ['Forbedringsforslag'], summary: 'Legg til kommentar', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kommentar'], properties: { kommentar: { type: 'string', maxLength: 1000 } } } } } },
          responses: { 201: { description: 'Kommentar lagt til' } },
        },
      },

      // ─── Data ───
      '/data/biler': {
        get: {
          tags: ['Data'], summary: 'Hent biler (cachet)', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste over biler', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bil' } } } } } },
        },
      },
      '/data/soner': {
        get: {
          tags: ['Data'], summary: 'Hent soner (cachet)', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste over soner', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Sone' } } } } } },
        },
      },
      '/data/sga-koder': {
        get: {
          tags: ['Data'], summary: 'Hent SGA-koder (cachet)', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste over SGA-koder', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SgaKode' } } } } } },
        },
      },
      '/data/kalender': {
        get: {
          tags: ['Data'], summary: 'Hent kalenderdata', security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'år', schema: { type: 'integer' } },
            { in: 'query', name: 'måned', schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Kalenderoversikt' } },
        },
      },
      '/data/egenmelding-kvoter': {
        get: {
          tags: ['Data'], summary: 'Hent egenmelding-kvoter', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Kvoteoversikt' } },
        },
      },
      '/data/tidregistrering': {
        post: {
          tags: ['Data'], summary: 'Opprett tidregistrering', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { bil_id: { type: 'integer' }, sone: { type: 'string' }, sendinger: { type: 'integer' }, vekt: { type: 'integer' }, pause: { type: 'integer' }, kommentarer: { type: 'string' }, dato: { type: 'string', format: 'date' }, start_tid: { type: 'string', format: 'date-time' }, slutt_tid: { type: 'string', format: 'date-time' }, registrering_type: { type: 'string', enum: ['arbeidstid', 'ferie', 'sykemelding', 'egenmelding', 'egenmelding_barn'] }, bomtur_venting: { type: 'string' }, sga_kode_id: { type: 'integer' }, sga_kode_annet: { type: 'string' } } } } } },
          responses: { 201: { description: 'Registrering opprettet' } },
        },
      },
      '/data/tidregistrering/{id}': {
        put: {
          tags: ['Data'], summary: 'Oppdater tidregistrering', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Oppdatert' } },
        },
      },
      '/data/oppdrag': {
        post: {
          tags: ['Data'], summary: 'Opprett oppdrag', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fra', 'til'], properties: { fra: { type: 'string' }, til: { type: 'string' }, vekt: { type: 'integer' }, volum: { type: 'number' }, kommentar: { type: 'string' } } } } } },
          responses: { 201: { description: 'Oppdrag opprettet' } },
        },
      },

      // ─── Upload ───
      '/upload/avvik': {
        post: {
          tags: ['Upload'], summary: 'Last opp enkelt avviksbilde', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } },
          responses: { 201: { description: 'Bilde lastet opp' } },
        },
      },
      '/upload/avvik/multiple': {
        post: {
          tags: ['Upload'], summary: 'Last opp flere avviksbilder (maks 10)', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { images: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } },
          responses: { 201: { description: 'Bilder lastet opp' } },
        },
      },
      '/upload/avvik/{filename}': {
        get: {
          tags: ['Upload'], summary: 'Hent avviksbilde',
          parameters: [{ in: 'path', name: 'filename', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Bildefil' }, 404: { description: 'Ikke funnet' } },
        },
      },

      // ─── Info ───
      '/info': {
        get: {
          tags: ['Info'], summary: 'Hent info-kort (admin)', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste over info-kort' } },
        },
        post: {
          tags: ['Info'], summary: 'Opprett info-kort (admin)', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kategori', 'navn', 'verdi'], properties: { kategori: { type: 'string', enum: ['telefon', 'kode'] }, navn: { type: 'string', maxLength: 100 }, verdi: { type: 'string', maxLength: 200 }, beskrivelse: { type: 'string', maxLength: 500 } } } } } },
          responses: { 201: { description: 'Opprettet' } },
        },
      },
      '/info/public': {
        get: {
          tags: ['Info'], summary: 'Hent info-kort (sjåfør)', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Info-kort (read-only)' } },
        },
      },
      '/info/{id}': {
        put: {
          tags: ['Info'], summary: 'Oppdater info-kort (admin)', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Oppdatert' } },
        },
        delete: {
          tags: ['Info'], summary: 'Deaktiver info-kort (admin)', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Deaktivert' } },
        },
      },

      // ─── Admin ───
      '/admin/sjåfører': {
        get: {
          tags: ['Admin'], summary: 'Hent alle sjåfører', security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Liste', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Sjåfør' } } } } } },
        },
      },
      '/admin/biler': {
        get: { tags: ['Admin'], summary: 'Hent alle biler', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
      },
      '/admin/soner': {
        get: { tags: ['Admin'], summary: 'Hent alle soner', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
      },
      '/admin/skift': {
        get: { tags: ['Admin'], summary: 'Hent alle skift', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Alle skift' } } },
      },
      '/admin/skift/{id}/godkjenn': {
        put: {
          tags: ['Admin'], summary: 'Godkjenn/avvis skift', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['godkjent'], properties: { godkjent: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Oppdatert' } },
        },
      },
      '/admin/skift/bulk-godkjenn': {
        put: {
          tags: ['Admin'], summary: 'Bulk-godkjenn skift', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['skift_ids', 'godkjent'], properties: { skift_ids: { type: 'array', items: { type: 'integer' } }, godkjent: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Bulk oppdatert' } },
        },
      },
      '/admin/avvik': {
        get: { tags: ['Admin'], summary: 'Hent alle avvik', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'sjåfør_id', schema: { type: 'integer' } }, { in: 'query', name: 'fra_dato', schema: { type: 'string', format: 'date' } }, { in: 'query', name: 'til_dato', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Avvik' } } },
      },
      '/admin/forbedringsforslag': {
        get: { tags: ['Admin'], summary: 'Hent alle forbedringsforslag', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'status', schema: { type: 'string' } }], responses: { 200: { description: 'Forbedringsforslag' } } },
      },
      '/admin/forbedringsforslag/{id}/status': {
        put: {
          tags: ['Admin'], summary: 'Oppdater forslagsstatus', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ny', 'under behandling', 'besvart'] }, kommentar: { type: 'string', maxLength: 1000 } } } } } },
          responses: { 200: { description: 'Status oppdatert' } },
        },
      },
      '/admin/registreringer': {
        get: {
          tags: ['Admin'], summary: 'Hent registreringer (paginert)', security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'sjåfør_id', schema: { type: 'integer' } },
            { in: 'query', name: 'bil_id', schema: { type: 'integer' } },
            { in: 'query', name: 'sone_id', schema: { type: 'integer' } },
            { in: 'query', name: 'fra_dato', schema: { type: 'string', format: 'date' } },
            { in: 'query', name: 'til_dato', schema: { type: 'string', format: 'date' } },
            { in: 'query', name: 'side', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
          ],
          responses: { 200: { description: 'Paginerte registreringer' } },
        },
      },
      '/admin/fakturering': {
        get: { tags: ['Admin'], summary: 'Hent fakturerbare skift', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Fakturerbare skift' } } },
      },
      '/admin/skift/{id}/fakturer': {
        put: {
          tags: ['Admin'], summary: 'Marker skift som fakturert', security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fakturert'], properties: { fakturert: { type: 'boolean' } } } } } },
          responses: { 200: { description: 'Oppdatert' } },
        },
      },
      '/admin/tidregistrering': {
        post: {
          tags: ['Admin'], summary: 'Opprett tidregistrering for sjåfør', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['sjåfør_id'], properties: { sjåfør_id: { type: 'integer' } } } } } },
          responses: { 201: { description: 'Opprettet' } },
        },
      },
      '/admin/export/{type}': {
        get: {
          tags: ['Admin'], summary: 'Eksporter data som CSV', security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'type', required: true, schema: { type: 'string', enum: ['skift', 'avvik', 'forbedringsforslag'] } },
            { in: 'query', name: 'sjåfør_id', schema: { type: 'integer' } },
            { in: 'query', name: 'fra_dato', schema: { type: 'string', format: 'date' } },
            { in: 'query', name: 'til_dato', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'CSV-fil', content: { 'text/csv': {} } } },
        },
      },

      // ─── CRUD (admin resources) ───
      '/crud/drivers': {
        get: { tags: ['CRUD'], summary: 'Hent sjåfører', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: {
          tags: ['CRUD'], summary: 'Opprett sjåfør', security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['navn', 'epost', 'passord'], properties: { navn: { type: 'string' }, epost: { type: 'string', format: 'email' }, passord: { type: 'string', minLength: 6 }, telefon: { type: 'string' }, aktiv: { type: 'boolean' }, admin: { type: 'boolean' } } } } } },
          responses: { 201: { description: 'Opprettet' } },
        },
      },
      '/crud/drivers/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater sjåfør', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
        delete: { tags: ['CRUD'], summary: 'Slett sjåfør', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet' } } },
      },
      '/crud/biler': {
        get: { tags: ['CRUD'], summary: 'Hent biler', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: { tags: ['CRUD'], summary: 'Opprett bil', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['registreringsnummer'], properties: { registreringsnummer: { type: 'string' }, merke: { type: 'string' }, modell: { type: 'string' }, årsmodell: { type: 'integer' } } } } } }, responses: { 201: { description: 'Opprettet' } } },
      },
      '/crud/biler/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater bil', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
        delete: { tags: ['CRUD'], summary: 'Slett bil', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet' } } },
      },
      '/crud/soner': {
        get: { tags: ['CRUD'], summary: 'Hent soner', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: { tags: ['CRUD'], summary: 'Opprett sone', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['navn'], properties: { navn: { type: 'string' }, beskrivelse: { type: 'string' } } } } } }, responses: { 201: { description: 'Opprettet' } } },
      },
      '/crud/soner/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater sone', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
        delete: { tags: ['CRUD'], summary: 'Slett sone', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet' } } },
      },
      '/crud/avvik/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater avviksstatus (admin)', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ny', 'under_behandling', 'løst', 'avvist'] }, admin_kommentar: { type: 'string' } } } } } }, responses: { 200: { description: 'Oppdatert' } } },
      },
      '/crud/forbedringsforslag/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater forslagsstatus (admin)', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
      },
      '/crud/oppdrag': {
        get: { tags: ['CRUD'], summary: 'Hent oppdrag', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: { tags: ['CRUD'], summary: 'Opprett oppdrag', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fra', 'til'], properties: { fra: { type: 'string' }, til: { type: 'string' }, vekt: { type: 'integer' }, volum: { type: 'number' }, kommentar: { type: 'string' } } } } } }, responses: { 201: { description: 'Opprettet' } } },
      },
      '/crud/oppdrag/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater oppdrag', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
        delete: { tags: ['CRUD'], summary: 'Slett oppdrag', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet' } } },
      },
      '/crud/sga-koder': {
        get: { tags: ['CRUD'], summary: 'Hent SGA-koder', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Liste' } } },
        post: { tags: ['CRUD'], summary: 'Opprett SGA-kode', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kode'], properties: { kode: { type: 'string' }, beskrivelse: { type: 'string' }, skal_faktureres: { type: 'boolean' } } } } } }, responses: { 201: { description: 'Opprettet' } } },
      },
      '/crud/sga-koder/{id}': {
        put: { tags: ['CRUD'], summary: 'Oppdater SGA-kode', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Oppdatert' } } },
        delete: { tags: ['CRUD'], summary: 'Slett/deaktiver SGA-kode', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet/deaktivert' } } },
      },

      // ─── Varslinger ───
      '/varslinger': {
        get: {
          tags: ['Varslinger'], summary: 'Hent varslinger', security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'lest', schema: { type: 'boolean' } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: { description: 'Varslinger' } },
        },
      },
      '/varslinger/ulest': {
        get: { tags: ['Varslinger'], summary: 'Antall uleste varslinger', security: [{ bearerAuth: [] }], responses: { 200: { description: '{ antall: int }' } } },
      },
      '/varslinger/{id}/les': {
        put: { tags: ['Varslinger'], summary: 'Marker som lest', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Markert' } } },
      },
      '/varslinger/les-alle': {
        put: { tags: ['Varslinger'], summary: 'Marker alle som lest', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Alle markert' } } },
      },
      '/varslinger/{id}': {
        delete: { tags: ['Varslinger'], summary: 'Slett varsling', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { 200: { description: 'Slettet' } } },
      },

      // ─── Trafikk ───
      '/trafikk': {
        get: {
          tags: ['Trafikk'], summary: 'Hent trafikkdata fra TomTom',
          responses: { 200: { description: 'Trafikkdata', content: { 'application/json': { schema: { type: 'object', properties: { roadwork: { type: 'array', items: { type: 'string' } }, incidents: { type: 'array', items: { type: 'string' } }, delays: { type: 'array', items: { type: 'string' } }, message: { type: 'string' } } } } } } },
        },
      },

      // ─── Vær ───
      '/weather': {
        get: {
          tags: ['Vær'], summary: 'Hent værdata fra Yr.no',
          parameters: [
            { in: 'query', name: 'lat', schema: { type: 'number', default: 58.97 } },
            { in: 'query', name: 'lon', schema: { type: 'number', default: 5.7331 } },
          ],
          responses: { 200: { description: 'Yr.no locationforecast JSON' } },
        },
      },
    },
  },
  apis: [], // All paths defined inline above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
