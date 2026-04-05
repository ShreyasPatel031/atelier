# Scrapegraph Integration Module

## Introduction and Purpose

The `scrapegraph_integration` module provides tools for integrating Scrapegraph AI's intelligent web scraping capabilities into CrewAI applications. It offers a robust solution for extracting structured and unstructured content from websites using AI-driven intelligent scraping.

## Architecture Overview

This module is a part of the `crewai_tools_web_scraping` module, providing a specific integration for Scrapegraph AI. It primarily consists of a tool class for performing the scraping operation and a schema for defining its input parameters. It acts as an interface between CrewAI agents and the Scrapegraph AI service, handling API communication, response validation, and error management.

## Core Components

### ScrapegraphScrapeTool

`ScrapegraphScrapeTool` is a CrewAI tool designed to leverage Scrapegraph AI for intelligent website content extraction. It allows users to specify a website URL and a natural language prompt to guide the AI in extracting relevant information. The tool handles API key management, URL validation, and robust error handling including rate limit management.

Key features:
- **Intelligent Scraping**: Utilizes Scrapegraph AI to understand and extract content based on user prompts.
- **Configurable**: Allows specifying `website_url` and `user_prompt` either at instantiation or during runtime.
- **API Key Management**: Supports API key through constructor or `SCRAPEGRAPH_API_KEY` environment variable.
- **URL Validation**: Ensures provided URLs are in a valid format.
- **Error Handling**: Catches and re-raises specific errors like `RateLimitError` and provides informative runtime errors.
- **Dependency Management**: Automatically prompts for installation of `scrapegraph-py` if missing.

### ScrapegraphScrapeToolSchema

`ScrapegraphScrapeToolSchema` defines the input parameters for the `ScrapegraphScrapeTool`. It ensures that the `website_url` is mandatory and properly formatted, and provides a default prompt for content extraction if none is specified.

Key parameters:
- `website_url` (str): The mandatory URL of the website to be scraped.
- `user_prompt` (str): An optional prompt to guide the AI in extracting specific content. Defaults to "Extract the main content of the webpage."

## How it Fits into the Overall System

The `scrapegraph_integration` module enhances the `crewai_tools_web_scraping` capabilities by providing an advanced, AI-powered option for web content extraction. Agents within the CrewAI framework can utilize `ScrapegraphScrapeTool` to perform complex scraping tasks, benefiting from Scrapegraph AI's intelligence to retrieve accurate and relevant information from dynamic and complex web pages. This integration allows for more sophisticated data collection and analysis workflows within CrewAI-powered applications.
