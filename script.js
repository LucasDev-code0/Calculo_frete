/* ==========================================
   CONFIGURAÇÕES
========================================== */

const UNINASSAU = {
    latitude: -3.7768,
    longitude: -38.5615
};

const TARIFA_BASE = 5.00;
const VALOR_POR_KM = 2.00;


/* ==========================================
   ELEMENTOS DO HTML
========================================== */

const form = document.getElementById("cepForm");
const cepInput = document.getElementById("cep");

const enderecoBox = document.getElementById("enderecoBox");
const endereco = document.getElementById("endereco");
const bairro = document.getElementById("bairro");
const cidade = document.getElementById("cidade");

const loading = document.getElementById("loading");

const resultado = document.getElementById("resultado");
const erro = document.getElementById("erro");
const mensagemErro = document.getElementById("mensagemErro");

const distancia = document.getElementById("distancia");
const tempo = document.getElementById("tempo");
const uberValor = document.getElementById("uberValor");
const freteValor = document.getElementById("freteValor");

const novoCalculo = document.getElementById("novoCalculo");


/* ==========================================
   MÁSCARA DO CEP
========================================== */

cepInput.addEventListener("input", function () {

    let valor = cepInput.value
        .replace(/\D/g, "")
        .substring(0, 8);

    if (valor.length > 5) {

        valor =
            valor.substring(0, 5) +
            "-" +
            valor.substring(5);

    }

    cepInput.value = valor;

});


/* ==========================================
   FORMULÁRIO
========================================== */

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    esconderErro();

    resultado.classList.add("hidden");

    const cep = cepInput.value
        .replace(/\D/g, "");

    if (cep.length !== 8) {

        mostrarErro(
            "Digite um CEP válido com 8 números."
        );

        return;

    }

    mostrarLoading();

    try {

        /* ==================================
           1. CONSULTAR VIA CEP
        ================================== */

        const dadosCep =
            await consultarCEP(cep);

        if (dadosCep.erro) {

            throw new Error(
                "CEP não encontrado."
            );

        }


        /* ==================================
           MOSTRAR ENDEREÇO
        ================================== */

        endereco.textContent =
            dadosCep.logradouro ||
            "Logradouro não informado";

        bairro.textContent =
            `Bairro: ${dadosCep.bairro || "Não informado"}`;

        cidade.textContent =
            `${dadosCep.localidade || ""} - ${dadosCep.uf || ""}`;

        enderecoBox.classList.remove("hidden");


        /* ==================================
           2. BUSCAR COORDENADAS DO CEP
           
           IMPORTANTE:
           NÃO usamos mais Nominatim.
        ================================== */

        const coordenadas =
            await consultarCoordenadasCEP(cep);


        /* ==================================
           3. CALCULAR ROTA
        ================================== */

        const rota =
            await calcularRota(
                coordenadas.latitude,
                coordenadas.longitude
            );


        /* ==================================
           4. MOSTRAR RESULTADO
        ================================== */

        mostrarResultado(rota);

    }

    catch (error) {

        console.error(
            "ERRO COMPLETO:",
            error
        );

        mostrarErro(
            error.message ||
            "Não foi possível calcular o frete."
        );

    }

    finally {

        esconderLoading();

    }

});


/* ==========================================
   VIA CEP
========================================== */

async function consultarCEP(cep) {

    const url =
        `https://viacep.com.br/ws/${cep}/json/`;

    const resposta =
        await fetch(url);

    if (!resposta.ok) {

        throw new Error(
            "Erro ao consultar o ViaCEP."
        );

    }

    return await resposta.json();

}


/* ==========================================
   COORDENADAS DO CEP
========================================== */

async function consultarCoordenadasCEP(cep) {

    const url =
        `https://brasilapi.com.br/api/cep/v2/${cep}`;

    console.log(
        "Consultando coordenadas:",
        url
    );

    const resposta =
        await fetch(url);

    if (!resposta.ok) {

        throw new Error(
            "A API de localização não conseguiu encontrar as coordenadas deste CEP."
        );

    }

    const dados =
        await resposta.json();

    console.log(
        "Dados de localização:",
        dados
    );


    /* ==============================
       VERIFICAR COORDENADAS
    ============================== */

    if (
        !dados.location ||
        !dados.location.coordinates
    ) {

        throw new Error(
            "O CEP foi encontrado, mas não possui coordenadas disponíveis."
        );

    }


    const latitude =
        parseFloat(
            dados.location.coordinates.latitude
        );

    const longitude =
        parseFloat(
            dados.location.coordinates.longitude
        );


    if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude)
    ) {

        throw new Error(
            "As coordenadas retornadas para este CEP são inválidas."
        );

    }


    return {
        latitude: latitude,
        longitude: longitude
    };

}


/* ==========================================
   CALCULAR ROTA
========================================== */

async function calcularRota(
    latitudeDestino,
    longitudeDestino
) {

    const origem =
        `${UNINASSAU.longitude},${UNINASSAU.latitude}`;

    const destino =
        `${longitudeDestino},${latitudeDestino}`;


    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origem};${destino}` +
        `?overview=false`;


    console.log(
        "Calculando rota:",
        url
    );


    const resposta =
        await fetch(url);


    if (!resposta.ok) {

        throw new Error(
            "Erro ao calcular a rota."
        );

    }


    const dados =
        await resposta.json();


    if (
        dados.code !== "Ok" ||
        !dados.routes ||
        dados.routes.length === 0
    ) {

        throw new Error(
            "Não foi possível encontrar uma rota entre a UNINASSAU e o destino."
        );

    }


    const rota =
        dados.routes[0];


    const distanciaKm =
        rota.distance / 1000;


    const tempoMinutos =
        Math.ceil(
            rota.duration / 60
        );


    return {
        distanciaKm,
        tempoMinutos
    };

}


/* ==========================================
   MOSTRAR RESULTADO
========================================== */

function mostrarResultado(rota) {

    const km =
        Math.max(
            0.1,
            rota.distanciaKm
        );


    const valorEstimado =
        TARIFA_BASE +
        (km * VALOR_POR_KM);


    distancia.textContent =
        `${km.toFixed(1)} km`;


    tempo.textContent =
        `${rota.tempoMinutos} min`;


    uberValor.textContent =
        formatarMoeda(valorEstimado);


    freteValor.textContent =
        formatarMoeda(valorEstimado);


    resultado.classList.remove(
        "hidden"
    );


    resultado.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* ==========================================
   FORMATAR DINHEIRO
========================================== */

function formatarMoeda(valor) {

    return valor.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* ==========================================
   LOADING
========================================== */

function mostrarLoading() {

    loading.classList.remove(
        "hidden"
    );

}


function esconderLoading() {

    loading.classList.add(
        "hidden"
    );

}


/* ==========================================
   ERRO
========================================== */

function mostrarErro(mensagem) {

    mensagemErro.textContent =
        mensagem;

    erro.classList.remove(
        "hidden"
    );

    erro.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function esconderErro() {

    erro.classList.add(
        "hidden"
    );

}


/* ==========================================
   NOVO CÁLCULO
========================================== */

novoCalculo.addEventListener(
    "click",
    function () {

        form.reset();

        enderecoBox.classList.add(
            "hidden"
        );

        resultado.classList.add(
            "hidden"
        );

        esconderErro();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);