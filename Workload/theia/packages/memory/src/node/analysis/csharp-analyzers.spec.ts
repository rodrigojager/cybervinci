// *****************************************************************************
// Copyright (C) 2026.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { expect } from 'chai';
import {
    LanguageAnalysisContext,
    MemoryFile
} from '../../common';
import { CSharpStructuralAnalyzer } from './csharp-structural-analyzer';
import { CppStructuralAnalyzer } from './cpp-structural-analyzer';
import { GoStructuralAnalyzer } from './go-structural-analyzer';
import { JavaStructuralAnalyzer } from './java-structural-analyzer';
import { PythonStructuralAnalyzer } from './python-structural-analyzer';
import { RustStructuralAnalyzer } from './rust-structural-analyzer';
import { TreeSitterStructuralAnalyzer } from './tree-sitter-structural-analyzer';
import { TypeScriptJavaScriptStructuralAnalyzer } from './typescript-javascript-structural-analyzer';

describe('C# Memory analyzers', () => {

    it('extracts structural C# symbols, dependency hints, and test methods', () => {
        const result = new CSharpStructuralAnalyzer().analyze(contextFor([
            'using Xunit;',
            'namespace Demo.Api;',
            'public class OrdersController : ControllerBase',
            '{',
            '    private readonly IOrderService service;',
            '    public OrdersController(IOrderService service) { this.service = service; }',
            '    [HttpGet("orders")]',
            '    public IActionResult Get() { return Ok(service.List()); }',
            '}',
            'public class OrdersControllerTests',
            '{',
            '    [Fact]',
            '    public void Get_returns_orders() { }',
            '}'
        ].join('\n')));

        expect(result.imports).to.deep.equal(['Xunit']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'Get')).to.equal(true);
        const controller = result.symbols.find(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController');
        const testMethod = result.symbols.find(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'Get_returns_orders');
        expect(testMethod).to.not.equal(undefined);
        expect(result.relations.some(relation => relation.sourceId === testMethod?.id && relation.targetId === controller?.id && relation.relationType === 'tests')).to.equal(true);
        expect(result.relations.some(relation => relation.sourceId === controller?.id && relation.targetId === testMethod?.id && relation.relationType === 'tested_by')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'IOrderService')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'List')).to.equal(true);
    });

    it('extracts ASP.NET controller routes, verbs, action parameters, and filters', () => {
        const result = new CSharpStructuralAnalyzer().analyze(contextFor([
            'using Microsoft.AspNetCore.Authorization;',
            'namespace Demo.Api;',
            '[ApiController]',
            '[Authorize]',
            '[Route("api/orders")]',
            'public class OrdersController : ControllerBase',
            '{',
            '    [ServiceFilter(typeof(AuditFilter))]',
            '    [HttpGet("{id}")]',
            '    public ActionResult<OrderDto> Get([FromRoute] int id, [FromQuery] bool includeItems) { return Ok(); }',
            '}'
        ].join('\n')));

        const controller = result.symbols.find(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController');
        expect(controller?.metadata?.isAspNetController).to.equal(true);
        expect(controller?.metadata?.normalizedSymbolKind).to.equal('controller');
        expect(controller?.metadata?.routePrefix).to.equal('api/orders');
        expect(controller?.metadata?.filters).to.deep.equal(['Authorize']);

        const endpoint = result.symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'Get');
        expect(endpoint?.metadata?.normalizedSymbolKind).to.equal('controller_action');
        expect(endpoint?.metadata?.httpMethods).to.deep.equal(['GET']);
        expect(endpoint?.metadata?.route).to.equal('api/orders/{id}');
        expect(endpoint?.metadata?.parameters).to.deep.equal(['int', 'bool']);
        expect(endpoint?.metadata?.parameterNames).to.deep.equal(['id', 'includeItems']);
        expect(endpoint?.metadata?.parameterBindings).to.deep.equal(['id:FromRoute', 'includeItems:FromQuery']);
        expect(endpoint?.metadata?.filters).to.deep.equal(['Authorize', 'ServiceFilter']);
    });

    it('extracts EF Core DbContext, DbSet, entities, and basic relations', () => {
        const result = new CSharpStructuralAnalyzer().analyze(contextFor([
            'using Microsoft.EntityFrameworkCore;',
            'namespace Demo.Data;',
            'public class OrdersDbContext : DbContext',
            '{',
            '    public DbSet<Order> Orders { get; set; }',
            '}',
            'public class Order',
            '{',
            '    public int Id { get; set; }',
            '    public string Number { get; set; }',
            '}'
        ].join('\n')));

        const dbContext = result.symbols.find(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersDbContext');
        const dbSet = result.symbols.find(symbol => symbol.symbolKind === 'property' && symbol.name === 'Orders');
        const entity = result.symbols.find(symbol => symbol.symbolKind === 'class' && symbol.name === 'Order');

        expect(dbContext?.metadata?.isDbContext).to.equal(true);
        expect(dbContext?.metadata?.normalizedSymbolKind).to.equal('db_context');
        expect(dbSet?.metadata?.isDbSet).to.equal(true);
        expect(dbSet?.metadata?.efEntityType).to.equal('Order');
        expect(entity?.metadata?.isEfEntityCandidate).to.equal(true);
        expect(entity?.metadata?.normalizedSymbolKind).to.equal('entity');
        expect(result.relations.some(relation => relation.sourceId === dbSet?.id && relation.targetId === entity?.id && relation.relationType === 'uses_entity')).to.equal(true);
        expect(result.relations.some(relation => relation.sourceId === dbContext?.id && relation.targetId === entity?.id && relation.relationType === 'uses_entity')).to.equal(true);
    });

    it('normalizes C# test class and test method symbol metadata', () => {
        const result = new CSharpStructuralAnalyzer().analyze(contextFor([
            'namespace Demo.Tests;',
            '[TestClass]',
            'public class OrderServiceTests',
            '{',
            '    [TestMethod]',
            '    public void Create_maps_order() { }',
            '}'
        ].join('\n')));

        const testClass = result.symbols.find(symbol => symbol.name === 'OrderServiceTests');
        const testMethod = result.symbols.find(symbol => symbol.name === 'Create_maps_order');
        expect(testClass?.metadata?.normalizedSymbolKind).to.equal('test_class');
        expect(testClass?.metadata?.isTestClass).to.equal(true);
        expect(testMethod?.symbolKind).to.equal('test_method');
        expect(testMethod?.metadata?.normalizedSymbolKind).to.equal('test_method');
    });

    it('keeps C# structural fallback available but marks semantic confidence low', () => {
        const result = new CSharpStructuralAnalyzer().analyze(contextFor([
            'namespace Demo;',
            'public class Service',
            '{',
            '    public void Run() { }',
            '}'
        ].join('\n')));

        expect(result.analyzerId).to.equal('csharp-structural-fallback');
        expect(result.diagnostics?.some(diagnostic => diagnostic.id === 'csharp-structural-fallback-low-confidence')).to.equal(true);
        expect(result.symbols.every(symbol => symbol.metadata?.analysisMode === 'structural-fallback')).to.equal(true);
        expect(result.symbols.every(symbol => symbol.metadata?.confidenceLevel === 'low')).to.equal(true);
        expect(result.relations.length).to.be.greaterThan(0);
        expect(result.relations.every(relation => relation.confidenceLevel === 'inferred')).to.equal(true);
        expect(result.relations.every(relation => relation.confidenceScore <= 0.45)).to.equal(true);
        expect(result.relations.every(relation => relation.metadata?.confidenceLevel === 'low')).to.equal(true);
    });

});

describe('C/C++ Memory analyzer', () => {

    it('extracts includes, namespaces, types, functions, calls, dependencies, and tests', () => {
        const result = new CppStructuralAnalyzer().analyze(contextFor([
            '#include <vector>',
            '#include "orders/service.hpp"',
            '',
            'namespace demo {',
            'class BaseHandler {',
            'public:',
            '    virtual void list() = 0;',
            '};',
            '',
            'class OrderHandler : public BaseHandler {',
            '    OrderService* service;',
            'public:',
            '    explicit OrderHandler(OrderService* service) : service(service) {}',
            '    void list() override {',
            '        service->listOrders();',
            '        recordAudit();',
            '    }',
            '};',
            '',
            'void registerRoutes(OrderHandler& handler) {',
            '    handler.list();',
            '}',
            '}',
            '',
            'void test_register_routes() {',
            '    demo::OrderHandler handler(nullptr);',
            '    registerRoutes(handler);',
            '}'
        ].join('\n'), 'src/orders/handler.cpp', '.cpp', 'cpp'));

        expect(result.imports).to.deep.equal(['orders/service.hpp', 'vector']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'demo')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'BaseHandler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrderHandler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'constructor' && symbol.name === 'OrderHandler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'registerRoutes')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'test_register_routes')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'BaseHandler')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderHandler')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'listOrders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'recordAudit')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'list')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'registerRoutes')).to.equal(true);
    });

});

describe('Java Memory analyzer', () => {

    it('extracts packages, imports, classes, methods, endpoints, calls, annotations, dependencies, and tests', () => {
        const result = new JavaStructuralAnalyzer().analyze(contextFor([
            'package com.demo.orders;',
            '',
            'import org.springframework.web.bind.annotation.GetMapping;',
            'import org.springframework.web.bind.annotation.RestController;',
            'import org.junit.jupiter.api.Test;',
            '',
            '@RestController',
            '@RequestMapping("/api")',
            'public class OrdersController {',
            '    private final OrderService service;',
            '',
            '    public OrdersController(OrderService service) {',
            '        this.service = service;',
            '    }',
            '',
            '    @GetMapping("/orders")',
            '    public List<Order> listOrders() {',
            '        return service.listOrders();',
            '    }',
            '}',
            '',
            'class OrdersControllerTest {',
            '    @Test',
            '    void listOrders_returnsOrders() {',
            '        new OrdersController(new OrderService()).listOrders();',
            '    }',
            '}'
        ].join('\n'), 'src/main/java/com/demo/orders/OrdersController.java', '.java', 'java'));

        expect(result.imports).to.deep.equal([
            'org.junit.jupiter.api.Test',
            'org.springframework.web.bind.annotation.GetMapping',
            'org.springframework.web.bind.annotation.RestController'
        ]);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'com.demo.orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController' && symbol.attributes?.includes('RestController'))).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'field' && symbol.name === 'service')).to.equal(true);
        const endpoint = result.symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'listOrders');
        expect(endpoint?.metadata?.httpMethods).to.deep.equal(['GET']);
        expect(endpoint?.metadata?.route).to.equal('/orders');
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'listOrders_returnsOrders')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'listOrders')).to.equal(true);
    });

    it('extracts JAX-RS endpoints', () => {
        const result = new JavaStructuralAnalyzer().analyze(contextFor([
            'package com.demo.health;',
            '',
            'import jakarta.ws.rs.GET;',
            'import jakarta.ws.rs.Path;',
            '',
            '@Path("/health")',
            'public class HealthResource {',
            '    @GET',
            '    @Path("/ready")',
            '    public Response ready() {',
            '        return Response.ok().build();',
            '    }',
            '}'
        ].join('\n'), 'src/main/java/com/demo/health/HealthResource.java', '.java', 'java'));

        const endpoint = result.symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'ready');
        expect(endpoint?.metadata?.framework).to.equal('jax-rs');
        expect(endpoint?.metadata?.httpMethods).to.deep.equal(['GET']);
        expect(endpoint?.metadata?.route).to.equal('/ready');
        expect(result.callHints?.some(hint => hint.targetName === 'ok')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'build')).to.equal(true);
    });

});

describe('Go Memory analyzer', () => {

    it('extracts packages, imports, interfaces, methods, endpoints, calls, dependencies, and tests', () => {
        const result = new GoStructuralAnalyzer().analyze(contextFor([
            'package orders',
            '',
            'import (',
            '    "net/http"',
            '    "github.com/go-chi/chi/v5"',
            ')',
            '',
            'type OrderService interface {',
            '    List() []Order',
            '}',
            '',
            'type OrderHandler struct {',
            '    OrderService',
            '}',
            '',
            'func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {',
            '    h.renderOrders(w, h.OrderService.List())',
            '}',
            '',
            'func (h *OrderHandler) renderOrders(w http.ResponseWriter, orders []Order) {',
            '    writeJSON(w, orders)',
            '}',
            '',
            'func RegisterRoutes(r chi.Router, handler *OrderHandler) {',
            '    r.Get("/orders", handler.ListOrders)',
            '    http.HandleFunc("/health", Health)',
            '}',
            '',
            'func Health(w http.ResponseWriter, r *http.Request) {',
            '    w.WriteHeader(http.StatusOK)',
            '}',
            '',
            'func TestListOrders(t *testing.T) {',
            '    handler := &OrderHandler{}',
            '    handler.ListOrders(nil, nil)',
            '}'
        ].join('\n'), 'orders/handler_test.go', '.go', 'go'));

        expect(result.imports).to.deep.equal(['github.com/go-chi/chi/v5', 'net/http']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'interface' && symbol.name === 'OrderService')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'struct' && symbol.name === 'OrderHandler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'ListOrders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'GET /orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'ANY /health')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'TestListOrders')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderHandler')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'renderOrders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'writeJSON')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'ListOrders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'Health')).to.equal(true);
    });

});

describe('Rust Memory analyzer', () => {

    it('extracts modules, imports, structs, enums, traits, functions, calls, dependencies, and tests', () => {
        const result = new RustStructuralAnalyzer().analyze(contextFor([
            'use crate::services::{OrderService, AuditLog};',
            'use std::sync::Arc;',
            '',
            'pub mod api {',
            '    pub struct OrderHandler {',
            '        pub service: Arc<OrderService>,',
            '        audit: AuditLog,',
            '    }',
            '',
            '    pub enum OrderState {',
            '        Open,',
            '        Closed,',
            '    }',
            '',
            '    pub trait Handler {',
            '        fn list(&self) -> Vec<OrderState>;',
            '    }',
            '',
            '    impl Handler for OrderHandler {',
            '        fn list(&self) -> Vec<OrderState> {',
            '            self.service.list_orders();',
            '            record_audit();',
            '            Vec::new()',
            '        }',
            '    }',
            '',
            '    pub async fn register_routes(handler: OrderHandler) {',
            '        handler.list();',
            '    }',
            '',
            '    #[test]',
            '    fn lists_orders() {',
            '        let handler = build_handler();',
            '        handler.list();',
            '    }',
            '}'
        ].join('\n'), 'src/api/mod.rs', '.rs', 'rust'));

        expect(result.imports).to.deep.equal(['crate::services::AuditLog', 'crate::services::OrderService', 'std::sync::Arc']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'api')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'struct' && symbol.name === 'OrderHandler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'enum' && symbol.name === 'OrderState')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'interface' && symbol.name === 'Handler')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'list')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'register_routes')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'lists_orders')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'AuditLog')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'Handler')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderHandler')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'list_orders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'record_audit')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'list')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'build_handler')).to.equal(true);
    });

});

describe('Python Memory analyzer', () => {

    it('extracts modules, classes, functions, imports, endpoints, calls, dependencies, and tests', () => {
        const result = new PythonStructuralAnalyzer().analyze(contextFor([
            'from fastapi import APIRouter',
            'from services.orders import OrderService',
            'import pytest',
            '',
            'router = APIRouter()',
            '',
            'class OrdersController:',
            '    def __init__(self, service: OrderService):',
            '        self.service = service',
            '',
            '    @router.get("/orders")',
            '    def list_orders(self):',
            '        return self.service.list_orders()',
            '',
            '@router.post("/orders")',
            'def create_order(payload: OrderInput):',
            '    return save_order(payload)',
            '',
            'def helper():',
            '    return create_order({})',
            '',
            'def test_lists_orders():',
            '    assert helper() is not None'
        ].join('\n'), 'orders/api.py', '.py', 'python'));

        expect(result.imports).to.deep.equal(['fastapi', 'pytest', 'services.orders']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'orders.api')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === '__init__')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'GET /orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'POST /orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'helper')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'test_lists_orders')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderInput')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'list_orders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'save_order')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'helper')).to.equal(true);
    });

    it('extracts Django URL pattern endpoints', () => {
        const result = new PythonStructuralAnalyzer().analyze(contextFor([
            'from django.urls import path',
            'from .views import list_orders',
            '',
            'urlpatterns = [',
            '    path("orders/", list_orders, name="orders"),',
            ']'
        ].join('\n'), 'orders/urls.py', '.py', 'python'));

        const endpoint = result.symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'ANY orders/');
        expect(endpoint?.metadata?.framework).to.equal('django-urlpattern');
        expect(endpoint?.metadata?.route).to.equal('orders/');
        expect(result.callHints?.some(hint => hint.targetName === 'list_orders')).to.equal(true);
    });

});

describe('TypeScript/JavaScript Memory analyzers', () => {

    it('extracts TS/JS symbols, imports, endpoints, calls, dependencies, and tests', () => {
        const result = new TypeScriptJavaScriptStructuralAnalyzer().analyze(contextFor([
            'import express from "express";',
            'import { OrderService } from "./order-service";',
            'export interface Order {',
            '    id: string;',
            '}',
            'export class OrdersController {',
            '    constructor(private readonly service: OrderService) {}',
            '    list(): Order[] { return this.service.listOrders(); }',
            '}',
            'const app = express();',
            'app.get("/orders", (_req, res) => {',
            '    const controller = new OrdersController(new OrderService());',
            '    res.json(controller.list());',
            '});',
            'test("lists orders", () => {',
            '    expect(new OrdersController(new OrderService()).list()).toEqual([]);',
            '});'
        ].join('\n'), 'Service.ts', '.ts', 'typescript'));

        expect(result.imports).to.deep.equal(['./order-service', 'express']);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'interface' && symbol.name === 'Order')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'OrdersController')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'method' && symbol.name === 'list')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'GET /orders')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'test_method' && symbol.name === 'lists orders')).to.equal(true);
        expect(result.dependencyHints?.some(hint => hint.targetTypeName === 'OrderService')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'listOrders')).to.equal(true);
        expect(result.callHints?.some(hint => hint.targetName === 'list')).to.equal(true);
    });

    it('extracts decorator endpoints from Nest-style controllers', () => {
        const result = new TypeScriptJavaScriptStructuralAnalyzer().analyze(contextFor([
            'import { Controller, Get } from "@nestjs/common";',
            '@Controller("orders")',
            'export class OrdersController {',
            '    @Get(":id")',
            '    findOne() {',
            '        return loadOrder();',
            '    }',
            '}'
        ].join('\n'), 'orders.controller.ts', '.ts', 'typescript'));

        const endpoint = result.symbols.find(symbol => symbol.symbolKind === 'endpoint' && symbol.name === 'findOne');
        expect(endpoint?.metadata?.httpMethods).to.deep.equal(['GET']);
        expect(endpoint?.metadata?.route).to.equal(':id');
        expect(result.callHints?.some(hint => hint.targetName === 'loadOrder')).to.equal(true);
    });

});

describe('Tree-sitter Memory analyzer', () => {

    it('infers fallback symbols with confidence metadata when optional tree-sitter grammars are unavailable', () => {
        const result = new TreeSitterStructuralAnalyzer().analyze(contextFor([
            'module Billing',
            '  class InvoiceService',
            '    def total_for(account)',
            '      calculate(account)',
            '    end',
            '  end',
            'end'
        ].join('\n'), 'lib/billing/invoice_service.rb', '.rb', 'ruby'));

        expect(result.analyzerId).to.equal('tree-sitter-structural');
        expect(result.symbols.some(symbol => symbol.symbolKind === 'namespace' && symbol.name === 'Billing')).to.equal(true);
        expect(result.symbols.some(symbol => symbol.symbolKind === 'class' && symbol.name === 'InvoiceService')).to.equal(true);
        const method = result.symbols.find(symbol => symbol.symbolKind === 'method' && symbol.name === 'total_for');
        expect(method?.metadata?.confidenceLevel).to.equal('inferred');
        expect(method?.metadata?.extractionSource).to.equal('heuristic');
        expect(result.relations.some(relation => relation.confidenceLevel === 'inferred' && relation.relationType === 'contains')).to.equal(true);
        expect(result.diagnostics?.some(diagnostic => diagnostic.message.includes('Tree-sitter grammar for ruby is unavailable'))).to.equal(true);
    });

});

function contextFor(content: string, fileName = 'Service.cs', extension = '.cs', languageId = 'csharp'): LanguageAnalysisContext {
    const file: MemoryFile = {
        id: 'file_service',
        relativePath: fileName,
        fileName,
        extension,
        languageId,
        sizeBytes: content.length,
        contentHash: 'hash',
        isIgnored: false,
        isGenerated: false,
        isBinary: false,
        isSensitive: false
    };
    return {
        workspacePath: '/workspace',
        file,
        content,
        createSymbolId: seed => `symbol_${seed}`,
        createRelationId: seed => `relation_${seed}`
    };
}
